//    Backbone-DNode
//    (c) 2011 Beau Sorensen
//    Backbone-DNode may be freely distributed under the MIT license.
//    For all details and documentation:
//    https://github.com/sorensen/backbone-dnode

// Publish Subscribe middleware
// ----------------------------

var Pubsub,
    Clients       = {},
    Channels      = {},
    Subscriptions = {};

// Exports for CommonJS
if (typeof exports !== 'undefined') {
    var _           = require('underscore')._,
        Redis       = require('redis'),
        Pub         = Redis.createClient(),
        Sub         = Redis.createClient();
}

// Add to the main namespace with the Pubsub middleware
// for DNode, accepts a socket client and connection
Pubsub = function(client, con) {
    var self = this;
    
    // Client connected
    con.on('ready', function() {
        Clients[con.id] = client;
    });
    
    // Client disconnected
    con.on('end', function() {
        if (Clients[con.id]) delete Clients[con.id];
        
        // Remove all instances of current client the channels, by traversing
        // through the clients 'channel' property, instead of going through every channel
        if (Subscriptions[con.id] && Subscriptions[con.id].channels) _.each(Subscriptions[con.id].channels, function(chan) {
            if (Channels[chan] && Channels[chan].clients[con.id]) {
                delete Channels[chan].clients[con.id];
            }
            delete Subscriptions[con.id];
        });
        // Unsubscribe from all redis channels
        Sub.unsubscribe();
    });
    
    _.extend(this, {

        //###connections
        // Return all current connections contained 
        // in this thread, 
        connections : function(next) {
            next(Object.keys(Clients));
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
            if (!Channels[chan]) {
                Channels[chan] = { 
                    name    : chan, 
                    clients : {} 
                };
            }
            Channels[chan].clients[id] = client;

            // Create the subscription object for the client if 
            // needed, used for easier lookups based on clients
            if (!Subscriptions[id]) {
                Subscriptions[id] = { 
                    client   : client, 
                    channels : {} 
                };
            }
            // Add the channel to the clients subscriptions, 
            // used for easy lookups on disconnections
            if (!Subscriptions[id].channels[chan]) {
                Subscriptions[id].channels[chan] = {};
            }
            // Redis subscription
            Sub.subscribe(chan);
            next && next(model, options);
        },
        
        //###unsubscribe
        // Unsubscribe from model changes via channel
        unsubscribe : function(model, options, next) {
            if (!model || !options.channel || !Channels[options.channel]) {
                options.error && options.error(400, model, options);
                next && next(model, options);
                return;
            }
            delete Channels[options.channel].clients[con.id];
            delete Subscriptions[con.id].channels[options.channel]
            
            // Redis unsubscribe
            Sub.unsubscribe(options.channel);
            next && next(model, options);
        },
        
        //###publish
        // Publish to redis 
        publish : function(model, options, next) {
            if (!model || !options.channel || !Channels[options.channel]) {
                options.error && options.error(400, model, options);
                next && next(model, options);
                return;
            }
            // Send to redis
            Pub.publish(options.channel, JSON.stringify({
                model   : model,
                options : options
            }));
            next && next(model, options);
        },
        
        //###pushed
        // Push a message to application clients based on channels, used
        // as the delivery method for redis published events, but can be 
        // used by itself on a single thread basis
        pushed : function(model, options, next) {
            if (!model || !options.channel || !Channels[options.channel]) {
                options.error && options.error(400, model, options);
                next && next(model, options);
                return;
            }
            // Publish based by channel
            _.each(Channels[options.channel].clients, function(someone) {
                someone.published(model, options)
            });
            next && next(model, options);
        }
    });
    
    //##Redis publish subscribe event handling
    //----------------------------------------

    // Redis published message, push new data to each 
    // client connected with the givin channel
    Sub.on('message', function(channel, message) {
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
    Sub.on('subscribe', function(channel, count) {
        _.each(Channels[channel].clients, function(someone) {
            someone.subscribed({}, {
                channel : channel
            });
        });
    });
    
    // Redis unsubscribe message, alert each client that 
    // someone has left the channel ( optional )
    Sub.on('unsubscribe', function(channel, count) {
        _.each(Channels[channel].clients, function(someone) {
            someone.unsubscribed({}, {
                channel : channel
            });
        });
    });
};

// The top-level namespace. All public classes and modules will
// be attached to this. Exported for both CommonJS and the browser.
if (typeof exports !== 'undefined') {
    module.exports = Pubsub;
} else {
    this.Pubsub = Pubsub;
}