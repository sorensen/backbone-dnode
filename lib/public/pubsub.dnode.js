(function(ß) {
    // Backbone dnode sync
    // -------------------
    
    // Remote protocol
    ß.Protocols.Pubsub = function(client, con) {
    
        _.extend(this, {
        
            // New subscription received
            subscribed : function(resp, options) {
                if (!options.channel) return;
                options.finished && options.finished(resp);
            },
        
            // Someone has unsubscribed
            unsubscribed : function(resp, options) {
                if (!options.channel) return;
                options.finished && options.finished(resp);
            },
            
            // Published from the ß.Server
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
        url : function() {
            var base = ß.Helpers.getUrl(this.collection) || this.urlRoot || '';
            if (this.isNew()) return base;
            return base + (base.charAt(base.length - 1) == ':' ? '' : ':') + encodeURIComponent(this.id);
        },
        
        // Publish the model's data to everyone that 
        // has subscribed to it
        publish : function(options, callback) {
            if (!ß.Server) return (options.error && options.error(503, model, options));
            var model = this;
            options         || (options = {});
            options.method  || (options.method = 'update');
            options.channel || (options.channel = (model.collection) ? ß.Helpers.getUrl(model.collection) : ß.Helpers.getUrl(model));
            ß.Server.publish(model.toJSON(), options, function(resp, options){
                if (!options.silent) model.trigger('publish', model, options);
                callback && callback(resp, options);
            });
            return this;
        }
    });
    
    // Common extention object for both ß.Models and collections
    var common = {
        // Subscribe to the ß.Server for model changes, if 'override' is set to true
        // in the options, this model will replace any other ß.Models in the local 
        // 'ß.Store' which holds the reference for future updates. Uses Backbone 'url' 
        // for subscriptions, relabeled to 'channel' for clarity
        subscribe : function(options, callback) {
            if (!ß.Server) return (options.error && options.error(503, model, options));
            var model = this;
            options         || (options = {});
            options.channel || (options.channel = (model.collection) ? ß.Helpers.getUrl(model.collection) : ß.Helpers.getUrl(model));
            
            // Add the model to a local object container so that other methods
            // called from the ß.Server have access to it
            if (!ß.Store[options.channel] || options.override) {
                ß.Store[options.channel] = model;
                ß.Server.subscribe(model.toJSON(), options, function(resp, options) {
                    if (!options.silent) model.trigger('subscribe', model, options);
                    callback && callback(resp, options);
                });
            } else {
                if (!options.silent) model.trigger('subscribe', model, options);
                callback && callback(model, options);
            }
            return this;
        },
        
        // Stop listening for published model data, removing the reference in the local
        // subscription 'ß.Store', will trigger an unsubscribe event unless 'silent' 
        // is passed in the options
        unsubscribe : function(options, callback) {
            if (!ß.Server) return (options.error && options.error(503, model, options));
            var model = this;
            options         || (options = {});
            options.channel || (options.channel = (model.collection) ? ß.Helpers.getUrl(model.collection) : ß.Helpers.getUrl(model));
            ß.Server.unsubscribe({}, options, function(resp, options) {
                if (!options.silent) model.trigger('unsubscribe', model, options);
                callback && callback(resp, options);
            });
            
            // The object must be deleted, or a new subscription with the same 
            // channel name will not be correctly 'synced', unless a 'override' 
            // option is sent upon subscription
            delete ß.Store[options.channel];
            return this;
        }
    };
    _.extend(Backbone.Model.prototype, common);
    _.extend(Backbone.Collection.prototype, common);
    
})(ß)
