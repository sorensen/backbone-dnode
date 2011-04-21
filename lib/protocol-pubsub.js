
// Global containers
Clients       = {};
Channels      = {};
Subscriptions = {};

(function() {
    // Publish Subscribe Protocol
    // --------------------------
    
    // Exports for CommonJS
    if (typeof exports !== 'undefined') {
        _    = require('underscore')._;
        UUID = require('node-uuid');
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
        });
        
        // Return all current connections
        this.connections = function(next) {
            next(Object.keys(Clients));
        };
        
        // Channel subscription
        this.subscribe = function(model, options, next) {
            console.log('Subscribe: model: ', JSON.stringify(model));
            console.log('Subscribe: options: ', JSON.stringify(options));
            
            if (!options.channel) return (options.error && options.error(400, model, options));
                
            var id   = con.id,
                chan = options.channel;
                
            // Check for the existance of channel in question and create if not found
            // TODO: Cleanup, this is a bit hacky, but works
            if (!Channels[chan]) Channels[chan] = { name:chan, clients:{} };
            if (!Channels[chan].clients[id]) Channels[chan].clients[id] = client
            
            // Check for the existance of channel in question and create if not found
            if (!Subscriptions[id]) Subscriptions[id] = { client:client, channels:{} };
            if (!Subscriptions[id].channels[chan]) Subscriptions[id].channels[chan] = {};
            
            // Remove all instances of current client the channels, by traversing
            // through the clients 'channel' property, instead of going through every channel
            con.on('end', function() {
                if (Subscriptions[id] && Subscriptions[id].channels) _.each(Subscriptions[id].channels, function(chan) {
                    if (Channels[chan] && Channels[chan].clients[id]) delete Channels[chan].clients[id];
                });
                delete Subscriptions[id];
            });
            
            // Notify all other channel subscribers that a new 
            // connection has been made
            _.each(Channels[chan].clients, function(someone) {
                someone.subscribed(model, options);
            });
            next && next(model, options);
        };
        
        // Unsubscribe from model changes via channel
        this.unsubscribe = function(model, options, next) {
            console.log('Unsubscribe: model: ', JSON.stringify(model));
            console.log('Unsubscribe: options: ', JSON.stringify(options));
            
            if (!model || !options.channel || !Channels[options.channel])
                return (options.error && options.error(400, model, options));
            
            delete Channels[options.channel].clients[con.id];
            delete Subscriptions[con.id].channels[options.channel]
            
            // Notify each other channel client that someone has 
            // unsubscribed from the current channel / model
            _.each(Channels[options.channel].clients, function(someone) {
                someone.unsubscribed(model, options);
            });
            next && next(model, options);
        };
        
        // Publish a message to application clients based on channels
        this.publish = function(model, options, next) {
            console.log('Publish: model: ', JSON.stringify(model));
            console.log('Publish: options: ', JSON.stringify(options));
            
            if (!model || !options.channel || !Channels[options.channel])
                return (options.error && options.error(400, model, options));
            
            // Publish based by channel
            _.each(Channels[options.channel].clients, function(someone) {
                someone.published(model, options)
            });
            next && next(model, options);
        };
    };
})()