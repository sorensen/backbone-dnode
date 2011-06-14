// Backbone CRUD support
// ---------------------

// Basic implementation of server-side CRUD for 
// integrating with Backbone to allow for socket.io
// transport mechanisms

// Exports for CommonJS
if (typeof exports !== 'undefined') {
    _      = require('underscore')._;
    Keys   = require('keys');
    UUID   = require('node-uuid');
    Hash   = require('./hash');
    Buffer = require('buffer').Buffer
} else {
    this.Protocol = Protocol = {};
}

// Storage containers
Store = new Keys.Redis();

// UUID hashing salt (for shortening)
var salt = 'abcdefghijklmnopqrstuvwxyz';

// Check for buffered data
var buffered = (Store instanceof Keys.Redis) ? false : true;

// Define server callable methods
Protocol = module.exports = function(client, con) {
    var self = this;
    
    // CRUD: Create
    this.create = function(model, options, next) {
    
        // Check for required data before continuing
        // trigger an error callback if one was sent
        if (!model || model.id || !options.channel || !options.url) 
            return (options.error && options.error(400, model, options));
            
        // Check for temporary request, this will just mock the action
        // to all current clients, without saving the model
        if (options.temporary) {
            self.publish(model, options);
            next && next(model, options);
            return;
        }
            
        // Generate a new UUID and shorten using base64 encoding
        // Set the created timestamp if one is supplied
        model.created && (model.created = new Date().getTime());
        model.id = Hash.md5(UUID(), salt);
        var key = options.url + ':' + model.id;
        
        // Check to make sure we aren't overriding anything
        Store.has(key, function(err, exists) {
            if (exists) return (options.error && options.error(404, model, options));
            
            Store.set(key, JSON.stringify(model), function() {
                
                // Check 'silent' option to determine if this should
                // be published to the channel
                options.silent || self.publish(model, options);
                
                // Execute client callback if one provided
                next && next(model, options);
            });
        });
    };
    
    // CRUD: Read
    this.read = function(model, options, next) {
        if (!model || !options.channel || !options.url)
            return (options.error && options.error(400, model, options));
            
        Store.has(options.url, function(err, exists) {
            if (!exists) return (options.error && options.error(404, model, options));
            
            Store.get(options.url, function(err, val) {
                if (!val) options.error && options.error(model, options);
                
                val = buffered ? val.toString('utf8') : val;
                options.silent || client && client.read(JSON.parse(val), options);
                next && next(JSON.parse(val), options);
            });
        });
    };
    
    // CRUD: Update
    this.update = function(model, options, next) {
        if (!model || !model.id || !options.url)
            return (options.error && options.error(400, model, options));
        
        if (options.temporary) {
            self.publish(model, options);
            next && next(model, options);
            return;
        }
        
        Store.has(options.url, function(err, exists) {
            if (!exists && !options.force) return (options.error && options.error(404, model, options));
            
            model.modified && (model.modified = new Date().getTime());
            
            // Update existing model record in the database
            Store.set(options.url, JSON.stringify(model), function() {
                options.silent || self.publish(model, options);
                next && next(model, options);
            });
        });
    };
    
    // CRUD: Destroy 
    this.destroy = function(model, options, next) {
        if (!model || !model.id || !options.channel || !options.url) 
            return (options.error && options.error(400, model, options));
            
        if (options.temporary) {
            self.publish(model, options);
            next && next(model, options);
            return;
        }
            
        Store.has(options.url, function(err, exists) {
            if (!exists) return (options.error && options.error(404, model, options));
        
            Store.remove(options.url, function() {
                options.silent || self.publish(model, options);
                next && next(model, options);
            });
        });
    };
};