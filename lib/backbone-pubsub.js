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
var Pubsub,
    clients       = {},
    channels      = {},
    subscriptions = {};

// Redis client references
var pub,
    sub;

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
        if (clients[con.id]) delete clients[con.id];
        
        // Remove all instances of current client the channels, by traversing
        // through the clients 'channel' property, instead of going through every channel
        if (subscriptions[con.id] && subscriptions[con.id].channels) _.each(subscriptions[con.id].channels, function(chan) {
            if (channels[chan] && channels[chan].clients[con.id]) {
                delete channels[chan].clients[con.id];
            }
            delete subscriptions[con.id];
        });
        if (typeof sub !== 'undefined') {
            // Unsubscribe from all redis channels
            sub.unsubscribe();
        }
    });
    
    _.extend(this, {

        //###connections
        // Return all current connections contained 
        // in this thread, 
        connections : function(channel, next) {
            if (channel) {
                next(Object.keys(subscriptions[channel]));
            } else {
                next(Object.keys(clients));
            }
        },
        
        //###subscribe
        // Channel subscription, add the client to the internal
        // subscription object, creating a container for the channel
        // if one does not exist, then subscribe to the Redis client
        subscribe : function(model, options, next) {
            if (!options.channel) {
                options.error && options.error(400, model, options);
                next && next(model, options);
                return;
            }
            // Extract the lookup keys
            var id   = con.id,
                chan = options.channel;
                
            // Create the channel container and add the current
            // client to it if needed, stored in objects for easier
            // lookups, and extra information
            if (!channels[chan]) {
                channels[chan] = { 
                    name    : chan, 
                    clients : {} 
                };
            }
            channels[chan].clients[id] = client;

            // Create the subscription object for the client if 
            // needed, used for easier lookups based on clients
            if (!subscriptions[id]) {
                subscriptions[id] = { 
                    client   : client, 
                    channels : {} 
                };
            }
            // Add the channel to the clients subscriptions, 
            // used for easy lookups on disconnections
            if (!subscriptions[id].channels[chan]) {
                subscriptions[id].channels[chan] = {};
            }
            // Redis subscription
            if (typeof sub !== 'undefined') {
                sub.subscribe(chan);
            }
            next && next(model, options);
        },
        
        //###unsubscribe
        // Unsubscribe from model changes via channel
        unsubscribe : function(model, options, next) {
            if (!model || !options.channel || !channels[options.channel]) {
                options.error && options.error(400, model, options);
                next && next(model, options);
                return;
            }
            delete channels[options.channel].clients[con.id];
            delete subscriptions[con.id].channels[options.channel]
            
            // Redis unsubscribe
            if (typeof sub !== 'undefined') {
                sub.unsubscribe(options.channel);
            }
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
                self.pushed(model, options, next);
            }
            next && next(model, options);
        },
        
        //###pushed
        // Push a message to application clients based on channels, used
        // as the delivery method for redis published events, but can be 
        // used by itself on a single thread basis
        pushed : function(model, options, next) {
            if (!model || !options.channel || !channels[options.channel]) {
                options.error && options.error(400, model, options);
                next && next(model, options);
                return;
            }
            // Publish based by channel
            _.each(channels[options.channel].clients, function(someone) {
                someone.published(model, options)
            });
            next && next(model, options);
        }
    });
    
    // Redis publish subscribe event handling
    //----------------------------------------
    
    if (typeof sub !== 'undefined') {

        // Redis published message, push new data to each 
        // client connected with the givin channel
        sub.on('message', function(channel, message) {
            message     = JSON.parse(message);
            var model   = message.model,
                options = message.options;
            
            if (options.channel != channel) {
                return;
            }
            self.pushed(model, options);
        });
        
        // Redis subscribe message, alert each client that 
        // someone has joined the channel ( optional )
        sub.on('subscribe', function(channel, count) {
            _.each(channels[channel].clients, function(someone) {
                someone.subscribed({}, {
                    channel : channel
                });
            });
        });
        
        // Redis unsubscribe message, alert each client that 
        // someone has left the channel ( optional )
        sub.on('unsubscribe', function(channel, count) {
            _.each(channels[channel].clients, function(someone) {
                someone.unsubscribed({}, {
                    channel : channel
                });
            });
        });
    };
};

//###config
// Create and configure the redis clients used for pubsub events, if no 
// config is set, the pubsub mechanics will default to a single threaded 
// mode, with no redis support
Pubsub.config = function(publish, subscribe, next) {
    publish   && (pub = publish);
    subscribe && (sub = subscribe);
    next && next();
};

// The top-level namespace. All public classes and modules will
// be attached to this. Exported for both CommonJS and the browser.
if (typeof exports !== 'undefined') {
    module.exports = Pubsub;
} else {
    root.Pubsub = Pubsub;
}
