// Publish Subscribe Protocol
// --------------------------

// Containers
Clients       = {};
Channels      = {};
Subscriptions = {};

// Exports for CommonJS
if (typeof exports !== 'undefined') {
    _      = require('underscore')._;
} else {
    this.Protocol = Protocol = {};
}

// Define server-callable methods
Protocol = module.exports = function(client, con) {
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
                
                // Notify each other channel client that someone has 
                // unsubscribed from the current channel / model
                _.each(Channels[chan].clients, function(someone) {
                    someone.unsubscribed(model, {
                        channel : chan
                    });
                });
                delete Channels[chan].clients[con.id];
            }
            delete Subscriptions[con.id];
        });
    });
    
    _.extend(this, {

        // Return all current connections
        connections : function(next) {
            next(Object.keys(Clients));
        },
        
        // Channel subscription
        subscribe : function(model, options, next) {
            if (!options.channel) {
                options.error && options.error(400, model, options);
                next && next(model, options);
                return;
            }
            var id   = con.id,
                chan = options.channel;
                
            // Check for the existance of channel in question and create if not found
            // TODO: Cleanup, this is a bit hacky, but works
            if (!Channels[chan]) Channels[chan] = { name:chan, clients:{} };
            if (!Channels[chan].clients[id]) Channels[chan].clients[id] = client
            
            // Check for the existance of channel in question and create if not found
            if (!Subscriptions[id]) Subscriptions[id] = { client:client, channels:{} };
            if (!Subscriptions[id].channels[chan]) Subscriptions[id].channels[chan] = {};
            
            // Notify all other channel subscribers that a new 
            // connection has been made
            _.each(Channels[chan].clients, function(someone) {
                someone.subscribed(model, options);
            });
            next && next(model, options);
        },
        
        // Unsubscribe from model changes via channel
        unsubscribe : function(model, options, next) {
            if (!model || !options.channel || !Channels[options.channel]) {
                options.error && options.error(400, model, options);
                next && next(model, options);
                return;
            }
            delete Channels[options.channel].clients[con.id];
            delete Subscriptions[con.id].channels[options.channel]
            
            // Notify each other channel client that someone has 
            // unsubscribed from the current channel / model
            _.each(Channels[options.channel].clients, function(someone) {
                someone.unsubscribed(model, options);
            });
            next && next(model, options);
        },
        
        // Publish a message to application clients based on channels
        publish : function(model, options, next) {
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
};