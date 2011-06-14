// Publish Subscribe Protocol
// --------------------------

// Containers
Clients       = {};
Channels      = {};
Subscriptions = {};

// Exports for CommonJS
if (typeof exports !== 'undefined') {
    var _           = require('underscore')._,
        Redis       = require('redis'),
        Pub         = Redis.createClient(),
        Sub         = Redis.createClient();
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
            
            // Redis subscription
            Sub.subscribe(chan);
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
            
            // Redis unsubscribe
            Sub.unsubscribe(options.channel);
            next && next(model, options);
        },
        
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
        
        // Push a message to application clients based on channels
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
        _.each(Channels[options.channel].clients, function(someone) {
            someone.unsubscribed({}, {
                channel : channel
            });
        });
    });
};