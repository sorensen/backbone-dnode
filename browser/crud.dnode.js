//    Backbone-DNode
//    (c) 2011 Beau Sorensen
//    Backbone-DNode may be freely distributed under the MIT license.
//    For all details and documentation:
//    https://github.com/sorensen/backbone-dnode

(function() {
    // CRUD Middleware
    // ---------------
    
    // The top-level namespace. All public classes and modules will
    // be attached to this. Exported for both CommonJS and the browser.
    var CRUD;
    if (typeof exports !== 'undefined') {
        _        = require('underscore');
        Backbone = require('backbone');
    }
    
    // Add to the main namespace with the CRUD middleware
    // for DNode, accepts a socket client and connection
    CRUD = function(client, con) {
        _.extend(this, {
        
            //###created
            // A model has been created on the server,
            // get the model or collection based on channel 
            // name or url to set or add the new data
            created : function(resp, options) {
                resp = _.getMongoId(resp);
                var model = Store[options.channel];
                // Model processing
                if (model instanceof Backbone.Model) {
                    model.set(model.parse(resp));
                // Collection processing
                } else if (model instanceof Backbone.Collection) {
                    if (!model.get(resp.id)) model.add(model.parse(resp));
                }
                options.finished && options.finished(resp);
            },
            
            //###read
            // The server has responded with data from a 
            // model or collection read event, set or add 
            // the data to the model based on channel
            read : function(resp, options) {
                resp = _.getMongoId(resp);
                var model = Store[options.channel];
                // Model Processing
                if (model instanceof Backbone.Model) {
                    model.set(model.parse(resp));
                // Collection processing
                } else if (model instanceof Backbone.Collection) {
                    if (_.isArray(resp)) {
                        model.reset(model.parse(resp));
                    } else if (!model.get(resp.id)) {
                        model.add(model.parse(resp));
                    }
                }
                options.finished && options.finished(resp);
            },
            
            //###updated
            // A model has been updated with new data from the
            // server, set the appropriate model or collection
            updated : function(resp, options) {
                resp = _.getMongoId(resp);
                var model = Store[options.channel];
                // Collection processing
                if (model.get(resp.id)) {
                    model.get(resp.id).set(model.parse(resp));
                // Model processing
                } else {
                    model.set(model.parse(resp));
                }
                options.finished && options.finished(resp);
            },
            
            //###destroyed
            // A model has been destroyed 
            destroyed : function(resp, options) {
                resp = _.getMongoId(resp);
                Store[options.channel].remove(resp) || delete Store[options.channel];
                options.finished && options.finished(resp);
            },
        
            // The following procedures will only work for the acting client, 
            // this may prove to be useful for future procedures 
            selfCreated   : function(resp, options) { this.synced(resp, options) },
            selfRead      : function(resp, options) { this.synced(resp, options) },
            selfUpdated   : function(resp, options) { this.synced(resp, options) },
            selfDestroyed : function(resp, options) { this.synced(resp, options) },
            
            //###synced
            // Default synchronization event, call to Backbones internal
            // 'success' method, then the custom 'finished' method when 
            // everything has been completed
            synced : function(resp, options) {
                resp = _.getMongoId(resp);
            
                // Call to Backbone's predefined 'success' method which 
                // is created per each 'sync' event, then to an optional
                // 'finished' method for any final procedures
                options.success && options.success(resp);
                options.finished && options.finished(resp);
            }
        });
    };
    
    // Add to underscore utility functions to allow optional usage
    // This will allow other storage options easier to manage, such as
    // 'localStorage'. This must be set on the model and collection to 
    // be used on directly. Defaults to 'Backbone.sync' otherwise.
    _.mixin({
    
        //###sync
        // Set the model or collection's sync method to communicate through DNode
        sync : function(method, model, options) {
            if (!Server) return (options.error && options.error(503, model, options));
            
            // Remove the Backbone id from the model as not to conflict with 
            // Mongoose schemas, it will be re-assigned when the model returns
            // to the client side
            if (model.attributes && model.attributes._id) delete model.attributes.id;
            
            // Set the RPC options for model interaction
            options.type      || (options.type = model.type || model.collection.type);
            options.url       || (options.url = _.getUrl(model));
            options.channel   || (options.channel = (model.collection) ? _.getUrl(model.collection) : _.getUrl(model));
            options.method    || (options.method = method);
            
            // Delegate method call based on action
            switch (method) {
                case 'read'   : Server.read({}, options); break;
                case 'create' : Server.create(model.toJSON(), options); break;
                case 'update' : Server.update(model.toJSON(), options); break;
                case 'delete' : Server.destroy(model.toJSON(), options); break;
            };
        }
    });
    
    // CommonJS browser export
    if (typeof exports !== 'undefined') {
        module.exports = CRUD;
    } else {
        this.CRUD = CRUD;
    }
})()