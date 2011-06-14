// Backbone CRUD support
// ---------------------

// Basic implementation of server-side CRUD for 
// integrating with Backbone to allow for socket.io
// transport mechanisms

// Exports for CommonJS
if (typeof exports !== 'undefined') {
    _        = require('underscore')._;
    Mongoose = require('mongoose');
    Schema   = Mongoose.Schema;
    Schemas  = require('./schemas');
} else {
    this.Protocol = Protocol = {};
}

// The following are methods that the server may call to
Protocol = module.exports = function(client, con) {
    var self = this;
    
    _.extend(this, {
    
        // CRUD: Create
        create : function(data, options, next) {
            // Check for required data before continuing
            // trigger an error callback if one was sent
            if (!data || data._id || !options.channel || !options.type)  {
                options.error && options.error(400, data, options);
                next && next(data, options);
                return;
            }
            // Check for temporary request, this will just mock the action
            // to all current clients, without saving the data
            if (options.temporary) {
                this.publish(data, options);
                next && next(data, options);
                return;
            }
            var Model = Mongoose.model(options.type);
            var instance = new Model(data);

            instance.save(function (error) {
                if (error) {
                    options.error && options.error(500, data, options);
                    next && next(data, options);
                    return;
                }
                var parsed = JSON.parse(JSON.stringify(instance));
                
                options.silent || self.publish(parsed, options);
                next && next(parsed, options);
                return;
            });
        },
        
        // CRUD: Read
        read : function(data, options, next) {
            if (!options.type || !options.query) {
                options.error && options.error(400, data, options);
                next && next(data, options);
                return;
            }
            options.fields  || (options.fields = []);
            options.sorting || (options.sorting = {});
            var Model = Mongoose.model(options.type);
            
            if (options.query && options.query.id) {
                Model.findOne(options.query, function(error, doc) {
                    if (error) {
                        options.error && options.error(500, data, options);
                        next && next(data, options);
                        return;
                    }
                    if (!doc) {
                        options.error && options.error(404, data, options);
                        next && next(data, options);
                        return;
                    }
                    var parsed = JSON.parse(JSON.stringify(doc));
                    
                    client.read(parsed, options);
                    if (options.raw) {
                        // Raw object passed for server interaction
                        next && next(doc, options);
                    } else {
                        next && next(parsed, options);
                    }
                });
            } else {
                Model.find(options.query, options.fields, options.sorting, function(error, docs) {
                    if (error) {
                        options.error && options.error(500, data, options);
                        next && next(data, options);
                        return;
                    }
                    if (!docs || !docs[0]) {
                        options.error && options.error(404, data, options);
                        next && next(data, options);
                        return;
                    }
                    var parsed = JSON.parse(JSON.stringify(docs));
                    client.read(parsed, options);
                    next && next(parsed, options);
                });
            }
        },
        
        // CRUD: Update
        update : function(data, options, next) {
            if (!data || !data._id || !options.channel || !options.type) {
                options.error && options.error(404, data, options);
                next && next(data, options);
                return;
            }
            if (options.temporary) {
                this.publish(data, options);
                next && next(data, options);
                return;
            }
            var Model = Mongoose.model(options.type);
            
            Model.findById(data._id, function(error, doc) {
                if (error) {
                    options.error && options.error(500, data, options);
                    next && next(data, options);
                    return;
                }
                if (!doc) {
                    options.error && options.error(404, data, options);
                    next && next(data, options);
                    return;
                }
                delete data._id;
                _.extend(doc, data);
                
                doc.save(function(error) {
                    if (error) {
                        options.error && options.error(500, data, options);
                        next && next(data, options);
                        return;
                    }
                    var parsed = JSON.parse(JSON.stringify(doc));
                    options.silent || self.publish(parsed, options);
                    next && next(parsed, options);
                });
            });
        },
        
        // CRUD: Destroy
        destroy : function(data, options, next) {
            if (!data || !data._id || !options.channel || !options.url || !options.type) {
                options.error && options.error(400, data, options);
                next && next(data, options);
                return;
            }
            if (options.temporary) {
                this.publish(data, options);
                next && next(data, options);
                return;
            }
            var Model = Mongoose.model(options.type);
            
            Model.findById(data._id, function(error, doc) {
                if (error) {
                    options.error && options.error(500, data, options);
                    next && next(data, options);
                    return;
                }
                if (!doc) {
                    options.error && options.error(404, data, options);
                    next && next(data, options);
                    return;
                }
                doc.remove(function(error) {
                    if (error) {
                        options.error && options.error(500, data, options);
                        next && next(data, options);
                        return;
                    }
                    // Currently no models are being destroyed
                    self.publish(data, options);
                    next && next(data, options);
                });
            });
        }
    });
};