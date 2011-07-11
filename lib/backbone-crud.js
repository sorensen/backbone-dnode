//    Backbone-DNode
//    (c) 2011 Beau Sorensen
//    Backbone-DNode may be freely distributed under the MIT license.
//    For all details and documentation:
//    https://github.com/sorensen/backbone-dnode

// Backbone CRUD support
// ---------------------

// Save a reference to the global object.
var root = this;

// Local configurations
var config = {};

// Basic implementation of server-side CRUD for 
// integrating with Backbone to allow for socket.io
// transport mechanisms
var CRUD;

// Require Underscore, if we're on the server, and it's not already present.
var _ = root._;
if (!_ && (typeof require !== 'undefined')) _ = require('underscore')._;

var database;

// Add to the module exports for DNode middleware, 
// accepts a socket client and connection
CRUD = function(client, con) {
    var self = this;
    _.extend(this, {
    
        //###create
        // Create a new model with the givin data, publishing the 
        // event to the pub/sub middleware, builds upon Backbone 
        // options, if the option 'silent' is true, the event will 
        // not be published, alternatively, an option 'temporary' may 
        // be passed to publish the event without any persistance
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
            // Retreive the mongoose schema
            var Model    = Mongoose.model(options.type),
                instance = new Model(data);

            // Delegate to mongoose an attempt to save the model
            instance.save(function (error) {
                if (error) {
                    options.error && options.error(500, data, options);
                    next && next(data, options);
                    return;
                }
                // Little bit of a hack to get a pure JSON 
                // representation of the model attributes
                var parsed = JSON.parse(JSON.stringify(instance));
                options.silent || self.publish(parsed, options);
                next && next(parsed, options);
                return;
            });
        },
        
        //###read
        // Retrieve either a single model or collection of models 
        // from the database, can optionally pass in sorting or 
        // fields parameters, as well as a direct query statement
        // that can be executed directly against MongoDB
        read : function(data, options, next) {
            if (!options.type || !options.query) {
                options.error && options.error(400, data, options);
                next && next(data, options);
                return;
            }
            options.fields  || (options.fields = []);
            options.sorting || (options.sorting = {});
            var Model = database.model(options.type);
            
            // Check to see if a specific model was requested based on 'id', 
            // otherwise search the collection with the given parameters
            if (options.query && options.query.id) {
                Model.findOne(options.query, function(error, doc) {
                    if (error) {
                        options.error && options.error(500, data, options);
                        next && next(data, options);
                        return;
                    } else if (!doc) {
                        options.error && options.error(404, data, options);
                        next && next(data, options);
                        return;
                    }
                    var parsed = JSON.parse(JSON.stringify(doc));
                    // Respond to the connected client with the results
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
                    } else if (!docs || !docs[0]) {
                        options.error && options.error(404, data, options);
                        next && next(data, options);
                        return;
                    }
                    // Respond to the connected client with the results
                    var parsed = JSON.parse(JSON.stringify(docs));
                    client.read(parsed, options);
                    next && next(parsed, options);
                });
            }
        },
        
        //###update
        // Retrieve and update the attributes of a given model based on 
        // the query parameters, delegate to the pub/sub middleware if a 
        // change has been made, if a 'temporary' option has been provided, 
        // the change can be published without persisting to the database
        update : function(data, options, next) {
            if (!data || !data._id || !options.channel || !options.type) {
                options.error && options.error(404, data, options);
                next && next(data, options);
                return;
            }
            // Check for non-persistance option
            if (options.temporary) {
                this.publish(data, options);
                next && next(data, options);
                return;
            }
            var Model = database.model(options.type);
            Model.findById(data._id, function(error, doc) {
                if (error) {
                    options.error && options.error(500, data, options);
                    next && next(data, options);
                    return;
                } else if (!doc) {
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
        
        //###destroy
        // Remove the specified model from the database, only one model may be
        // removed at a time, passing a 'temporary' option will publish the change
        // without persisting to the database
        destroy : function(data, options, next) {
            if (!data || !data._id || !options.channel || !options.url || !options.type) {
                options.error && options.error(400, data, options);
                next && next(data, options);
                return;
            }
            // Check for non-persistance option
            if (options.temporary) {
                this.publish(data, options);
                next && next(data, options);
                return;
            }
            var Model = database.model(options.type);
            Model.findById(data._id, function(error, doc) {
                if (error) {
                    options.error && options.error(500, data, options);
                    next && next(data, options);
                    return;
                } else if (!doc) {
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
                    // Delegate to the pub/sub middleware with the results
                    self.publish(data, options);
                    next && next(data, options);
                });
            });
        }
    });
};

//###config
CRUD.config = function(mongoose, next) {
    database = mongoose;
    next && next();
};

// The top-level namespace. All public classes and modules will
// be attached to this. Exported for both CommonJS and the browser.
if (typeof exports !== 'undefined') {
    module.exports = CRUD;
} else {
    root.CRUD = CRUD;
}