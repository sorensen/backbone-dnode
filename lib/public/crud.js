(function(Protocols) {
    // Backbone DNode CRUD
    // -------------------
    
    // Backbone CRUD routines to be called from the server 
    // or delegated through the pub/sub protocol
    Protocols.CRUD = function(client, con) {
        
        // Created model (NOTE) New models must be created through collections
        this.created = function(resp, options) {
            if (!Store[options.channel].get(resp.id)) Store[options.channel].add(resp);
            options.finished && options.finished(resp);
        };
        
        // Fetched model
        this.read = function(resp, options) {
            if (Store[options.channel] instanceof Backbone.Model) 
                Store[options.channel].set(resp);
            
            else if (Store[options.channel] instanceof Backbone.Collection && !Store[options.channel].get(resp.id))
                Store[options.channel].add(resp);
            
            options.finished && options.finished(resp);
        };
        
        // Updated model data
        this.updated = function(resp, options) {
            if (Store[options.channel].get(resp.id)) Store[options.channel].get(resp.id).set(resp);
            else Store[options.channel].set(resp);
            options.finished && options.finished(resp);
        };
        
        // Destroyed model
        this.destroyed = function(resp, options) {
            Store[options.channel].remove(resp) || delete Store[options.channel];
            options.finished && options.finished(resp);
        };
    };
    
    _.extend(Backbone, {
        sync : function(method, model, options) {
            if (!Server) return (options.error && options.error(503, model, options));
            
            options.url     || (options.url = Helpers.getUrl(model));
            options.channel || (options.channel = (model.collection) ? Helpers.getUrl(model.collection) : Helpers.getUrl(model));
            options.method  || (options.method = method);
            
            // Direct server callback
            var callback = options.remote || false;
            delete options.remote;
            switch (method) {
                case 'read'   : Server.read(model.toJSON(), options, callback); break;
                case 'create' : Server.create(model.toJSON(), options, callback); break;
                case 'update' : Server.update(model.toJSON(), options, callback); break;
                case 'delete' : Server.destroy(model.toJSON(), options, callback); break;
            };
        }
    });
})(Protocols)