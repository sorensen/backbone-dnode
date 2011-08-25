//    Backbone-DNode
//    (c) 2011 Beau Sorensen
//    Backbone-DNode may be freely distributed under the MIT license.
//    For all details and documentation:
//    https://github.com/sorensen/backbone-dnode

// Publish Subscribe middleware
// ----------------------------

// Save a reference to the global object.
var root = this;

// Create the top level namespaced objects
var Pubsub;

// Various pub/sub based memory containers
var clients       = {},
    channels      = {},
    subscriptions = {};
    online        = {};
    tracker       = {};

// Redis client references
var pub,
    sub,
    db;

// Online sets prefix if DB supplied
var zFix = 'z:';

// Require Underscore, if we're on the server, and it's not already present.
var _ = root._;
if (!_ && (typeof require !== 'undefined')) _ = require('underscore')._;

// Add to the main namespace with the Pubsub middleware
// for DNode, accepts a socket client and connection
Pubsub = function(client, con) {
    var self = this;
    
    // Client connected
    con.on('ready', function() {
        clients[con.id] = client;
    });
    
    // Client disconnected
    con.on('end', function() {
        delete clients[con.id];
        // Remove all instances of current client the channels, by traversing
        // through the clients 'channel' property, instead of going through every channel
        _.each(subscriptions[con.id], function(chan) {
            var key = channels[chan].indexOf(con.id);
            if (!!~key) channels[chan].splice(key, 1);

            // Remove all of the backbone-tracked id's from memory and redis
            tracker[con.id] && _.each(tracker[con.id], function(on) {
                var key = online[chan].indexOf(on);
                if (!!~key) {
                    online[chan].splice(key, 1);
                    if (typeof db !== 'undefined') db.zrem(zFix + chan, on);
                }
            })
        });
        delete subscriptions[con.id];
        delete tracker[con.id];

        // Unsubscribe from all redis channels
        if (typeof sub !== 'undefined') sub.unsubscribe();
    });
    
    _.extend(this, {

        //###connections
        // Return all current connections contained 
        // in this thread, 
        connections : function(channel, next) {
            if (channel) next(channels[channel]);
            else next(Object.keys(clients));
        },

        //###online
        // Return all current connections contained 
        // in this thread, 
        online : function(options, next) {
            var chan = options.channel;
            if (!chan) {
                options.error && options.error(400, model, options);
                return;
            }
            if (typeof db !== 'undefined') {
                getOnline(chan, options, function(resp) {
                    next && next(resp);
                });
                return;
            }
            next && next(channels[chan]);
        },
        
        //###subscribe
        // Channel subscription, add the client to the internal
        // subscription object, creating a container for the channel
        // if one does not exist, then subscribe to the Redis client
        subscribe : function(model, options, next) {
            var id   = con.id,
                chan = options.channel,
                on   = options.online;
            
            if (!chan) {
                options.error && options.error(400, model, options);
                return;
            }
            
            // If an `online` model id is supplied, such as a user id, 
            // it will be saved for lookup
            if (on) {
                if (!tracker[id]) tracker[id] = [];
                if (!~tracker[id].indexOf(on)) tracker[id].push(on);

                if (!online[chan]) online[chan] = [];
                if (!~online[chan].indexOf(on)) online[chan].push(on);

                // If we have a redis database instance, add this
                // to a sorted set for multi-threaded useage
                if (typeof db !== 'undefined') db.zadd(zFix + chan, new Date().getTime(), on);
            }

            // Create the channel container and add the current
            // client to it if needed, stored in objects for easier
            // lookups, and extra information
            if (!channels[chan]) channels[chan] = [];
            if (!~channels[chan].indexOf(id)) channels[chan].push(id);

            // Create the subscription object for the client if 
            // needed, used for easier lookups based on clients
            if (!subscriptions[id]) subscriptions[id] = [];

            // Add the channel to the clients subscriptions, 
            // used for easy lookups on disconnections
            if (!~subscriptions[id].indexOf(chan)) subscriptions[id].push(chan);

            // Redis subscription
            if (typeof sub !== 'undefined') sub.subscribe(chan);
            next && next(model, options);
        },
        
        //###unsubscribe
        // Unsubscribe from model changes via channel
        unsubscribe : function(model, options, next) {
            var id   = con.id,
                chan = options.channel,
                on   = options.online;

            if (!model || !chan || !channels[chan]) {
                options.error && options.error(400, model, options);
                next && next(model, options);
                return;
            }
            if (channels[chan]) {
                var cKey = channels[chan].indexOf(id);
                if (!!~cKey) channels[chan].splice(cKey, 1);
            }
            if (subscriptions[id]) {
                var sKey = subscriptions[id].indexOf(chan);
                if (!!~sKey) subscriptions[id].splice(sKey, 1);
            }

            // If an `online` model id is supplied, such as a user id, 
            // it will be saved for lookup
            if (on) {
                var oKey = online[chan].indexOf(on);
                if (!!~oKey) online[chan].splice(oKey, 1);

                var tKey = tracker[id].indexOf(on);
                if (!!~tKey) tracker[id].splice(tKey, 1);

                // If we have a redis database instance, add this
                // to a sorted set for multi-threaded useage
                if (typeof db !== 'undefined') db.zrem(zFix + chan, on);
            }

            // Redis unsubscribe
            if (typeof sub !== 'undefined') sub.unsubscribe(chan);
            next && next(model, options);
        },
        
        //###publish
        // Publish to redis if a connection has been supplied, 
        // otherwise send through to clients on this thread
        publish : function(model, options, next) {
            if (!model || !options.channel || !channels[options.channel]) {
                options.error && options.error(400, model, options);
                next && next(model, options);
                return;
            }
            if (typeof pub !== 'undefined') {
                pub.publish(options.channel, JSON.stringify({
                    model   : model,
                    options : options
                }));
            } else {
                pushed(model, options, next);
            }
            next && next(model, options);
        }
    });
};

//###config
// Create and configure the redis clients used for pubsub events, if no 
// config is set, the pubsub mechanics will default to a single threaded 
// mode, with no redis support
Pubsub.config = function(options, next) {
    options.publish   && (pub  = options.publish);
    options.subscribe && (sub  = options.subscribe);
    options.database  && (db   = options.database);
    options.zFix      && (zFix = options.zFix);

    configRedis();
    next && next();
};

        
//###pushed
// Push a message to application clients based on channels, used
// as the delivery method for redis published events, but can be 
// used by itself on a single thread basis
function pushed(model, options, next) {
    if (!model || !options.channel || !channels[options.channel]) {
        options.error && options.error(400, model, options);
        next && next(model, options);
        return;
    }
    // Publish based by channel
    _.each(channels[options.channel], function(someone) {
        clients[someone] && clients[someone].published(model, options)
    });
    next && next(model, options);
}

//###configRedis
// Redis subscribe event handling
function configRedis() {
    if (typeof sub !== 'undefined') {
        
        // Redis published message, push new data to each 
        // client connected with the givin channel
        sub.on('message', function(channel, message) {
            message     = JSON.parse(message);
            var model   = message.model,
                options = message.options;
            
            if (options.channel !== channel) return;
            pushed(model, options);
        });

        // Redis subscribe message, alert each client that 
        // someone has joined the channel ( optional )
        sub.on('subscribe', function(chan, count) {
            if (typeof db !== 'undefined') {
                getOnline(chan, {}, function(resp) {
                    _.each(channels[chan], function(someone) {
                        clients[someone] && clients[someone].subscribed(chan, resp);
                    });
                });
                return;
            }
            _.each(channels[chan], function(someone) {
                clients[someone] && clients[someone].subscribed(chan, online[chan]);
            });
        });
        
        // Redis unsubscribe message, alert each client that 
        // someone has left the channel ( optional )
        sub.on('unsubscribe', function(chan, count) {
            if (typeof db !== 'undefined') {
                getOnline(chan, {}, function(resp) {
                    _.each(channels[chan], function(someone) {
                        clients[someone] && clients[someone].unsubscribed(chan, resp);
                    });
                });
                return;
            }
            _.each(channels[chan], function(someone) {
                clients[someone] && clients[someone].unsubscribed(chan, online[chan]);
            });
        });
    };
}

// Get the redis set based on channel holding Backbone `id`s
function getOnline(channel, options, next) {
    options.min || (options.min = '-inf');
    options.max || (options.max = '+inf');

    db.zrangebyscore(zFix + channel, options.min, options.max, function(err, result) {
        if (err) return;
        next(result);
    });
}

// The top-level namespace. All public classes and modules will
// be attached to this. Exported for both CommonJS and the browser.
if (typeof exports !== 'undefined') module.exports = Pubsub;
else root.Pubsub = Pubsub;
