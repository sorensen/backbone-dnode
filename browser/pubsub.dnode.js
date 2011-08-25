//    Backbone-DNode
//    (c) 2011 Beau Sorensen
//    Backbone-DNode may be freely distributed under the MIT license.
//    For all details and documentation:
//    https://github.com/sorensen/backbone-dnode

(function() {
    // Pubsub Middleware
    // -----------------
    
    // This protocol is to be used as DNode middleware to provide
    // built-in pub/sub support to all Backbone models and collections,
    // as well as the client side counterpart to the server version
    // of this same RPC protocol. The naming of methods in the past
    // tense is to signal that the process has already happened on the 
    // server, this is a common naming pattern found throughout the app.
    
    // Save a reference to the global object.
    var root = this;
  
    // The top-level namespace. All public classes and modules will
    // be attached to this.
    var pubsub;
    
    // Remote server socket connection reference
    var server;
    
    // Storage container for subscribed models, allowing the returning method 
    // calls from the server know where and how to find the model in question
    var Store = root.Store || (root.Store = {});
    
    // Require Underscore, if we're on the server, and it's not already present.
    var _ = root._;
    if (!_ && (typeof require !== 'undefined')) _ = require('underscore')._;
    
    // Require Backbone, if we're on the server, and it's not already present.
    var Backbone = root.Backbone;
    if (!Backbone && (typeof require !== 'undefined')) Backbone = require('backbone');
    
    
    _.mixin({
        // ###getUrl
        // Helper function to get a URL from a Model or Collection as a property
        // or as a function.
        getUrl : function(object) {
            if (!(object && object.url)) return null;
            return _.isFunction(object.url) ? object.url() : object.url;
        }
    });
    
    // Add to the main namespace with the Pubsub middleware
    // for DNode, accepts a socket client and connection
    pubsub = function(client, con) {

        // Set a reference to the remote connection
        server = client;
        
        _.extend(this, {
        
            //###subscribed
            // Someone has subscribed to a channel
            // Note: This method is not required to run the 
            // application, it may prove as a useful way to 
            // update clients, and it may prove to be an added
            // security risk, when private channels are involved
            subscribed : function(channel, online) {
                Store[channel] && Store[channel].trigger('subscribe', online);
            },
        
            //###unsubscribed
            // Someone has unsubscribed from a channel, see the
            // note above, as it applies to this method as well
            unsubscribed : function(channel, online) {
                Store[channel] && Store[channel].trigger('unsubscribe', online);
            },
            
            //###published
            // Data has been published by another client, this serves
            // as the main entry point for server to client communication.
            // Events are delegated based on the original method passed, 
            // and are sent to 'crud.dnode.js' for completion
            published : function(resp, options) {
                if (!options.channel) return;
                switch (options.method) {
                    case 'create' : this.created(resp, options); break;
                    case 'update' : this.updated(resp, options); break;
                    case 'delete' : this.deleted(resp, options); break;
                };
            }
        });
    };
    
    // Extend default Backbone functionality
    _.extend(Backbone.Model.prototype, {
    
        //###url
        // This should probably be overriden with the underscore mixins
        // from the helpers.js methods
        url : function() {
            var base = _.getUrl(this.collection) || this.urlRoot || '';
            if (this.isNew()) return base;
            return base + (base.charAt(base.length - 1) == ':' ? '' : ':') + encodeURIComponent(this.id);
        },
        
        //###publish
        // Publish model data to the server for processing, this serves as 
        // the main entry point for client to server communications.  If no 
        // method is provided, it defaults to an 'update', which is the least 
        // conflicting method when returned to the client for processing
        publish : function(options, next) {
            if (!server) return (options.error && options.error(503, model, options));
            var model = this;
            options         || (options = {});
            options.method  || (options.method = 'update');
            options.channel || (options.channel = (model.collection) ? _.getUrl(model.collection) : _.getUrl(model));
            server.publish(model.toJSON(), options, function(resp, options){
                if (!options.silent) model.trigger('publish', model, options);
                next && next(resp, options);
            });
            return this;
        }
    });
    
    // Common extention object for both models and collections
    var common = {
    
        //###connection
        // Setting a reference to the DNode/socket connection to allow direct
        // server communication without the need of a global object
        connection : server,
    
        //###subscribe
        // Subscribe to the 'Server' for model changes, if 'override' is set to true
        // in the options, this model will replace any other models in the local 
        // 'Store' which holds the reference for future updates. Uses Backbone 'url' 
        // for subscriptions, relabeled to 'channel' for clarity
        subscribe : function(options, next) {
            if (!server) return (options.error && options.error(503, model, options));
            var model = this;
            options         || (options = {});
            options.channel || (options.channel = (model.collection) ? _.getUrl(model.collection) : _.getUrl(model));
            
            // Check for a root `user` object for a default `online` option
            if (!options.online && root.user) {
                options.online = root.user.get('id') || root.user.id;
            }

            // Add the model to a local object container so that other methods
            // called from the 'Server' have access to it
            if (!Store[options.channel] || options.override) {
                Store[options.channel] = model;
                server.subscribe(model.toJSON(), options, function(resp, options) {
                    next && next(resp, options);
                });
            } else {
                next && next(model, options);
            }
            return this;
        },
        
        //###unsubscribe
        // Stop listening for published model data, removing the reference in the local
        // subscription 'Store', will trigger an unsubscribe event unless 'silent' 
        // is passed in the options
        unsubscribe : function(options, next) {
            if (!server) return (options.error && options.error(503, model, options));
            var model = this;
            options         || (options = {});
            options.channel || (options.channel = (model.collection) ? _.getUrl(model.collection) : _.getUrl(model));
            
            // Check for a root `user` object for a default `online` option
            if (!options.online && root.user) {
                options.online = root.user.get('id') || root.user.id;
            }
            server.unsubscribe({}, options, function(resp, options) {
                next && next(resp, options);
            });
            
            // The object must be deleted, or a new subscription with the same 
            // channel name will not be correctly 'synced', unless a 'override' 
            // option is sent upon subscription
            delete Store[options.channel];
            return this;
        },

        //###online
        // Retrieve a list of all subscribed clients
        online : function(options, next) {
            if (!server) return (options.error && options.error(503, model, options));
            var model = this;
            options         || (options = {});
            options.channel || (options.channel = (model.collection) ? _.getUrl(model.collection) : _.getUrl(model));
            server.online(options, function(resp) {
                next && next(resp);
            });
        }
    };
    
    // Extend both model and collection with the pub/sub mechanics
    _.extend(Backbone.Model.prototype, common);
    _.extend(Backbone.Collection.prototype, common);
    
    // Exported for both CommonJS and the browser.
    if (typeof exports !== 'undefined') module.exports = pubsub;
    else root.pubsub = pubsub;

})();
