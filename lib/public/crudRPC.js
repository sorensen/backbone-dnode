(function(Protocols) {
    // Backbone DNode CRUD
    // -------------------
    
    // Backbone CRUD routines to be called from the server 
    // or delegated through the pub/sub protocol
    Protocols.CRUD = function(client, con) {
        
        _.extend(this, {
            // Delegate to the 'synced' event unless further extention is 
            // needed per CRUD event
            created : function(resp, options) {
                //console.log('Created: ', resp);
                resp = Helpers.getMongoId(resp);
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
            
            read : function(resp, options) {
                //console.log('Read: ', resp);
                resp = Helpers.getMongoId(resp);
                var model = Store[options.channel];
                // Model Processing
                if (model instanceof Backbone.Model) {
                    model.set(model.parse(resp));
                // Collection processing
                } else if (model instanceof Backbone.Collection) {
                    if (_.isArray(resp)) {
                        model.refresh(model.parse(resp));
                    } else if (!model.get(resp.id)) {
                        model.add(model.parse(resp));
                    }
                }
                options.finished && options.finished(resp);
            },
            
            updated : function(resp, options) {
                //console.log('Updated: ', resp);
                resp = Helpers.getMongoId(resp);
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
            
            destroyed : function(resp, options) {
                //console.log('Destroyed: ', resp);
                resp = Helpers.getMongoId(resp);
                Store[options.channel].remove(resp) || delete Store[options.channel];
                options.finished && options.finished(resp);
            },
        
            // The following procedures will only work for the acting client, 
            // this may prove to be useful for future procedures 
            selfCreated   : function(resp, options) { this.synced(resp, options) },
            selfRead      : function(resp, options) { this.synced(resp, options) },
            selfUpdated   : function(resp, options) { this.synced(resp, options) },
            selfDestroyed : function(resp, options) { this.synced(resp, options) },
            
            // Default synchronization event, call to Backbones internal
            // 'success' method, then the custom 'finished' method when 
            // everything has been completed
            synced : function(resp, options) {
                resp = Helpers.getMongoId(resp);
            
                // Call to Backbone's predefined 'success' method which 
                // is created per each 'sync' event, then to an optional
                // 'finished' method for any final procedures
                options.success && options.success(resp);
                options.finished && options.finished(resp);
            }
        });
    };
    
    _.extend(Backbone, {
        sync : function(method, model, options) {
            if (!Server) return (options.error && options.error(503, model, options));
            
            // Remove the Backbone id from the model as not to conflict with 
            // Mongoose schemas, it will be re-assigned when the model returns
            // to the client side
            if (model.attributes && model.attributes._id) delete model.attributes.id;
            
            // Set the RPC options for model interaction
            options.type      || (options.type = model.type || model.collection.type);
            options.url       || (options.url = Helpers.getUrl(model));
            options.channel   || (options.channel = (model.collection) ? Helpers.getUrl(model.collection) : Helpers.getUrl(model));
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
    
})(Protocols)