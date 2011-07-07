//    Aebleskiver
//    (c) 2011 Beau Sorensen
//    Aebleskiver may be freely distributed under the MIT license.
//    For all details and documentation:
//    https://github.com/sorensen/aebleskiver

(function() {
    // Pubsub Middleware
    // -----------------
    
    // This protocol is to be used as DNode middleware to provide
    // built-in pub/sub support to all Backbone models and collections,
    // as well as the client side counterpart to the server version
    // of this same RPC protocol. The naming of methods in the past
    // tense is to signal that the process has already happened on the 
    // server, this is a common naming pattern found throughout the app.
    
    // The top-level namespace. All public classes and modules will
    // be attached to this. Exported for both CommonJS and the browser.
    var Pubsub;
    if (typeof exports !== 'undefined') {
        Pubsub = exports;
    }
    
    // Add to the main namespace with the Pubsub middleware
    // for DNode, accepts a socket client and connection
    Pubsub = function(client, con) {
        _.extend(this, {
        
            //###subscribed
            // Someone has subscribed to a channel
            // Note: This method is not required to run the 
            // application, it may prove as a useful way to 
            // update clients, and it may prove to be an added
            // security risk, when private channels are involved
            subscribed : function(resp, options) {
                if (!options.channel) return;
                options.finished && options.finished(resp);
            },
        
            //###unsubscribed
            // Someone has unsubscribed from a channel, see the
            // note above, as it applies to this method as well
            unsubscribed : function(resp, options) {
                if (!options.channel) return;
                options.finished && options.finished(resp);
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
                    case 'read'   : this.read(resp, options); break;
                    case 'update' : this.updated(resp, options); break;
                    case 'delete' : this.destroyed(resp, options); break;
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
        publish : function(options, callback) {
            if (!Server) return (options.error && options.error(503, model, options));
            var model = this;
            options         || (options = {});
            options.method  || (options.method = 'update');
            options.channel || (options.channel = (model.collection) ? _.getUrl(model.collection) : _.getUrl(model));
            Server.publish(model.toJSON(), options, function(resp, options){
                if (!options.silent) model.trigger('publish', model, options);
                callback && callback(resp, options);
            });
            return this;
        }
    });
    
    // Common extention object for both models and collections
    var common = {
    
        //###subscribe
        // Subscribe to the 'Server' for model changes, if 'override' is set to true
        // in the options, this model will replace any other models in the local 
        // 'Store' which holds the reference for future updates. Uses Backbone 'url' 
        // for subscriptions, relabeled to 'channel' for clarity
        subscribe : function(options, callback) {
            if (!Server) return (options.error && options.error(503, model, options));
            var model = this;
            options         || (options = {});
            options.channel || (options.channel = (model.collection) ? _.getUrl(model.collection) : _.getUrl(model));
            
            // Add the model to a local object container so that other methods
            // called from the 'Server' have access to it
            if (!Store[options.channel] || options.override) {
                Store[options.channel] = model;
                Server.subscribe(model.toJSON(), options, function(resp, options) {
                    if (!options.silent) model.trigger('subscribe', model, options);
                    callback && callback(resp, options);
                });
            } else {
                if (!options.silent) model.trigger('subscribe', model, options);
                callback && callback(model, options);
            }
            return this;
        },
        
        //###unsubscribe
        // Stop listening for published model data, removing the reference in the local
        // subscription 'Store', will trigger an unsubscribe event unless 'silent' 
        // is passed in the options
        unsubscribe : function(options, callback) {
            if (!Server) return (options.error && options.error(503, model, options));
            var model = this;
            options         || (options = {});
            options.channel || (options.channel = (model.collection) ? _.getUrl(model.collection) : _.getUrl(model));
            Server.unsubscribe({}, options, function(resp, options) {
                if (!options.silent) model.trigger('unsubscribe', model, options);
                callback && callback(resp, options);
            });
            
            // The object must be deleted, or a new subscription with the same 
            // channel name will not be correctly 'synced', unless a 'override' 
            // option is sent upon subscription
            delete Store[options.channel];
            return this;
        }
    };
    
    // Extend both model and collection with the pub/sub mechanics
    _.extend(Backbone.Model.prototype, common);
    _.extend(Backbone.Collection.prototype, common);
    
    // CommonJS browser export
    if (typeof exports === 'undefined') {
        this.Pubsub = Pubsub;
    }
})()