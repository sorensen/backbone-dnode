//    Aebleskiver
//    (c) 2011 Beau Sorensen
//    Aebleskiver may be freely distributed under the MIT license.
//    For all details and documentation:
//    https://github.com/sorensen/aebleskiver

// Avatar Middleware
// -----------------

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
                options.error && options.error(400, data, options);
                next && next(data, options);
                return;
            }
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
    this.Avatar = Avatar;
}