//    Backbone-DNode
//    (c) 2011 Beau Sorensen
//    Backbone-DNode may be freely distributed under the MIT license.
//    For all details and documentation:
//    https://github.com/sorensen/backbone-dnode

// Avatar Middleware
// -----------------

// Save a reference to the global object.
var root = this;

// Require Underscore, if we're on the server, and it's not already present.
var _ = root._;
if (!_ && (typeof require !== 'undefined')) _ = require('underscore')._;

// Exports for CommonJS
var Avatar;
if (typeof exports !== 'undefined') {
    Gravatar = require('node-gravatar');
}

// Add to the main namespace with the Avatar middleware
// for DNode, accepts a socket client and connection
Avatar = function(client, con) {
    _.extend(this, {
    
        //###gravatar
        // Call to the Gravatar API to retrieve the email-based 
        // avatar, pass in `size`, `type`, and/or `rating` in the 
        // options for API delegation
        gravatar : function(options, next) {
            if (!options || !options.email) {
                options.error && options.error(400, options);
                next && next();
                return;
            }
            // Set the API options
            options.size   || (options.size = 120);
            options.type   || (options.type = 'mm');
            options.rating || (options.rating = 'R');
            
            // Request image from the gravatar API
            image = Gravatar.get(options.email, options.rating, options.size, options.type);
            client.gravatared(image, options);
            next && next(image, options);
        }
    });
};

// The top-level namespace. All public classes and modules will
// be attached to this. Exported for both CommonJS and the browser.
if (typeof exports !== 'undefined') {
    module.exports = Avatar;
} else {
    root.Avatar = Avatar;
}