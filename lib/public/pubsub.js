(function(Protocols) {
    // Backbone dnode sync
    // -------------------
    
    // Remote protocol
    Protocols.Pubsub = function(client, con) {
    
        // New subscription
        this.subscribed = function(resp, options) {
            if (options.channel) return;
            options.finished && options.finished(resp);
        };
    
        // New subscription
        this.unsubscribed = function(resp, options) {
            if (options.channel) return;
            options.finished && options.finished(resp);
        };
        
        // Published from the server
        this.published = function(resp, options) {
            if (!options.channel) return;
            switch (options.method) {
                case 'create' : this.created(resp, options); break;
                case 'update' : this.updated(resp, options); break;
                case 'delete' : this.destroyed(resp, options); break;
            };
        };
    };
    
    var extention = {
        subscribe : function(options, callback) {
            if (!Server) return (options.error && options.error(503, model, options));
            var model = this;
            options         || (options = {});
            options.channel || (options.channel = (model.collection) ? Helpers.getUrl(model.collection) : Helpers.getUrl(model));
            // Add the model to a local object container so that other methods
            // called from the server have access to it
            if (!Store[options.channel]) Store[options.channel] = model;
            if (!options.silent) this.trigger('subscribe', this, options);
            Server.subscribe(model.toJSON(), options, callback);
            return this;
        },
        
        unsubscribe : function(options, callback) {
            if (!Server) return (options.error && options.error(503, model, options));
            var model = this;
            options         || (options = {});
            options.channel || (options.channel = (model.collection) ? Helpers.getUrl(model.collection) : Helpers.getUrl(model));
            if (!options.silent) this.trigger('unsubscribe', this, options);
            Server.unsubscribe(model.toJSON(), options, callback);
            delete Store[options.channel];
            return this;
        }
    };
    _.extend(Backbone.Model.prototype, {
        url : function() {
            var base = Helpers.getUrl(this.collection) || this.urlRoot || '';
            if (this.isNew()) return base;
            return base + (base.charAt(base.length - 1) == ':' ? '' : ':') + encodeURIComponent(this.id);
        },
    });
    _.extend(Backbone.Model.prototype, extention);
    _.extend(Backbone.Collection.prototype, extention);
    
})(Protocols)