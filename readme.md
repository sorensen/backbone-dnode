# Backbone DNode

Backbone-DNode is a server to client integration package for use with, you guessed it, 
Backbone and DNode. The package brovides both node.js server side code for CRUD and 
Pubsub routines, as well as the matching client (or server) side routines.

The idea is to make writing a real-time Backbone application as simple as possible, 
the app is supported on the server side by using the Mongoose ORM for final validation
and persistence. 

The pubsub mechanics will default to using socket.io for updating the connected clients, 
however, you can pass a redis server and connection options to the pubsub `config` method
to utilize the built in redis publish and subscribe methods.

## Installation

Brief aside on how to install the project, this will soon be put into a full 
installation guide, but until then, you know the drill.

* [Install node.js](http://github.com/joyent/node)
* [Install NPM](http://github.com/joyent/npm)
* Install all project dependancies below with NPM

The project can be installed via NPM, or by cloning this repo into your project.

    npm install backbone-dnode

or

    git clone git://github.com/sorensen/backbone-dnode.git


## Server usage

Whip up a server and attatch DNode, while using the backbone-dnode
methods as middleware.

    var express    = require('express'),
        dnode      = require('dnode'),
        middleware = require('backbone-dnode'),
        browserify = require('browserify'),
        server     = express.createServer();

Bundle the client side support files with browserify

    var bundle = browserify({
        require : [
            'dnode',
            'backbone-dnode'
        ],
        mount   : '/core.js',
    });

Register your Mongoose schemas, and then pass the database 
instance to the CRUD configuration. At least one mongoose 
schema must be registered to use the CRUD routines.

    var Mongoose = require('mongoose'),
        Schema   = mongoose.Schema,
        ObjectId = Schema.ObjectId;

    Mongoose.connect('mongodb://localhost/db');

    Foo = new Schema({
        bar : { type : String, index : true }
    });

    database = Mongoose.connect('mongodb://localhost/db');
    middelware.crud.config(database);

Configure the Redis connection if you would like to use Redis 
as the pubsub mechanics. This will allow you to use other libraries 
such as Cluster, letting Redis act as the message queue.

    var redis = require('redis'),
        pub   = redis.createClient(),
        sub   = redis.createClient();
    
    middelware.pubsub.config(pub, sub);

Start the node server, and attach the backbone-dnode middleware
to the DNode instance.

    server.listen(8080);
    dnode()
        .use(middleware.pubsub)
        .use(middleware.crud)
        .listen(server);


## Client usage

Include DNode and the browserified bundle, as well as the Backbone and underscore 
dependancies.

    <script src="underscore.js"></script>
    <script src="backbone.js"></script>
    <script src="backbone-dnode.js"></script>


  Use browserify to require the backbone-dnode package, which will return 
  a JSON object containing the CRUD and Pubsub middleware for DNode.

    var dnode      = require('dnode'),
        middleware = require('backbone-dnode');

    dnode()
        .use(middleware.crud)
        .use(middleware.pubsub)
        .connect();


To connect to node.js and mongoose from the browser (or on the server), 
a model `type` for mongoose must be specified, as well as overriding the 
`sync` method on each model, an underscore mixin has been created to
provide optional support based on the model, in case you have different 
persistant support in mind.

    foo = Backbone.Model.extend({
        type : 'room',
        sync : _.sync
    });

Now create the collection, the attributes are set on both the model and 
collection to ensure that they will both use the same persistance, even if 
a model is created outside of the collection.
    
    FooCollection = Backbone.Collection.extend({
        url   : 'foos',
        type  : 'foo',
        sync  : _.sync,
        model  : Foo
    })

You can also override the sync method globally, by overriding 
the default `Backbone.sync` method

    Backbone.sync = _.sync

Once the middleware has been established, and a model has been set to use 
it (or if as been overridden globally), the default Backbone methods will 
automatically send the changes through the socket (dnode), where they will 
be mapped to the corresponding Mongoose schema, and then published to the 
connected clients that have been subscribed to the model or collection's URL.

    var options = {};
    var foos = new FooCollection();
    
    foos.subscribe(options, function() {
        foos.fetch({
            finished : function(data) {
            
                // The server has responded with the fetched data, 
                // and has added to the collection
                
            },
            error : function(code) {
            
                // Something went wrong, the server has responded with 
                // an error code for client side handling
            
            }
        });
    })

When the `subscribe` method has returned, you are now able to use all of the default 
Backbone model methods and have them interact with the server.  When using any of the 
Backbone `fetch`, `save`, `create`, or `delete` methods, a callback function will be 
used when the server responds, and a `finished` method will be executed when the middleware 
is done with the Backbone integration methods. Can optionally pass in an `error` method that 
will be triggered if anything goes wrong on the server side.  Think of `finished` as the 
Backbone `success` callback when normally using these methods, the name is changed to avoid 
conflicts.

    foos.create({
        bar : 'something'
    });

Backbone.fetch() has been overloaded to accept a `query` and `sorting` argument, which will be 
directly used on the server against the Mongoose ORM.  The default behavior for passing in `silent:true` 
or `add:true` will still be used.

    foos.fetch({
        query   : { bar : 'something' },
        sorting : { sort: [['created',-1]], limit: 20 }
    });

## Package dependancies (npm)

* [dnode @ 0.6.10](http://github.com/substack/dnode)
* [socket.io @ 0.6.17](http://github.com/LearnBoost/Socket.IO-node)
* [backbone @ 0.3.3](http://github.com/documentcloud/backbone)
* [underscore @ 1.1.5](http://github.com/documentcloud/underscore)
* [mongoose @ 1.3.0](http://github.com/LearnBoost/mongoose)
* [connect-mongodb @ 0.3.0](http://github.com/kcbanner/connect-mongo)
* [node-gravatar @ 1.0.0](http://github.com/arnabc/node-gravatar)