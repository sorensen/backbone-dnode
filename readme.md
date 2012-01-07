# Backbone DNode

Backbone-DNode is a server to client integration package for use with, you guessed it, 
Backbone and DNode. The package brovides both node.js server side code for CRUD and 
Pubsub routines, as well as the matching client (or server) side routines.

The idea is to make writing a real-time Backbone application as simple as possible, 
the app is supported on the server side by using the Mongoose ORM for final validation
and persistence. 

## Installation

The project can be installed via NPM, or by cloning this repo into your project.

    npm install backbone-dnode

or

    git clone git://github.com/sorensen/backbone-dnode.git


## Server usage

Whip up a server and attatch DNode, while using the backbone-dnode
methods as middleware.

```javascript

var express = require('express')
  , DNode = require('dnode')
  , BackboneDNode = require('backbone-dnode')
  , server = express.createServer()
````

Simply allow the package to be served through your express static if 
you have included the package via `npm`. Serving up the client side script 
can also be done via [browserify](https://github.com/substack/node-browserify), 
but that is entirely up to you, as this can be done many ways, and I generally 
prefer to bundle all client-side javascript into a single minifified file.

```javascript

server.use(express.static(__dirname + '/node_modules/backbone-dnode/browser'))
````

Register your Mongoose schemas, and then pass the database 
instance to the CRUD configuration. At least one mongoose 
schema must be registered to use the CRUD routines.

```javascript

var Mongoose = require('mongoose')
  , Schema = mongoose.Schema

Mongoose.connect('mongodb://localhost/db')

Foo = new Schema({
  bar: { type: String, index: true }
})

db = Mongoose.connect('mongodb://localhost/db')
````

(Optional) Configure the Redis connection if you would like to use Redis 
as the pubsub mechanics. This will allow you to use other libraries 
such as Cluster, letting Redis act as the message queue. If you don't 
use redis, the package will default to a single-threaded mode, which will 
work fine so long as you don't have multiple instances of node running.

```javascript

var redis = require('redis')
  , pub = redis.createClient()
  , sub = redis.createClient()
````

Start the node server, and attach the backbone-dnode middleware
to the DNode instance.

```javascript

server.listen(8080)
dnode()
  .use(BackboneDNode.pubsub({
    publish: pub
  , subscribe: sub 
  }))
  .use(BackboneDNode.crud({
    database: db
  }))
  .listen(server)
````

## Client usage

Simply include the client-side part of the package onto the page, which
may differ depending on how you serve up your static content.

```html
<script src="/dnode.js"></script>
<script src="/dnode.backbone.js"></script>
````

The package will need to be configured as well, allowing it to be used
as DNode middleware, if you wish to use the pubsub methods of the package, 
enable it, as it is not used by default.  This will broadcast all changes 
to any models to anyone else connected, otherwise, it will only call back to 
the current client, and use the default Backbone `success` methods.

```javascript

DNode()
  .use(root.dnodeBackbone({
    pubsub: true
  }))
  .connect()
````


To connect to node.js and mongoose from the browser (or on the server), 
a model `type` for mongoose must be specified, as well as overriding the 
`sync` method on each model, an underscore mixin has been created to
provide optional support based on the model, in case you have different 
persistant support in mind.

```javascript

foo = Backbone.Model.extend({
  type: 'room'
, sync: _.sync
})
````

Now create the collection, the attributes are set on both the model and 
collection to ensure that they will both use the same persistance, even if 
a model is created outside of the collection.

```javascript

FooCollection = Backbone.Collection.extend({
  url: 'foos'
, type: 'foo'
, sync: _.sync
, model: Foo
})
````

You can also override the sync method globally, by overriding 
the default `Backbone.sync` method

```javascript

Backbone.sync = _.sync
````

Once the middleware has been established, and a model has been set to use 
it (or if as been overridden globally), the default Backbone methods will 
automatically send the changes through the socket (dnode), where they will 
be mapped to the corresponding Mongoose schema, and then published to the 
connected clients that have been subscribed to the model or collection's URL.

```javascript
var options = {}
  , foos = new FooCollection()

foos.subscribe(options, function() {
  foos.fetch({
    finished: function(model, resp, options) {
      // The server has responded with the fetched data, 
      // and has added to the collection
    }
  , error: function(model, resp, options) {
      // Something went wrong, the server has responded with 
      // an error code for client side handling
    }
  })
})
````

When the `subscribe` method has returned, you are now able to use all of the default 
Backbone model methods and have them interact with the server.  When using any of the 
Backbone `fetch`, `save`, `create`, or `delete` methods, a callback function will be 
used when the server responds, and a `finished` method will be executed when the middleware 
is done with the Backbone integration methods. Can optionally pass in an `error` method that 
will be triggered if anything goes wrong on the server side.  Think of `finished` as the 
Backbone `success` callback when normally using these methods, the name is changed to avoid 
conflicts.

```javascript

foos.create({
    bar : 'something'
})
````

Backbone.fetch() has been overloaded to accept a `query` and `sorting` argument, which will be 
directly used on the server against the Mongoose ORM.  The default behavior for passing in `silent:true` 
or `add:true` will still be used.

```javascript

foos.fetch({
  query: { bar : 'something' }
, sorting: { sort: [['created',-1]], limit: 20 }
})
````

