# Backbone DNode

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

    var express = require('express'),
        dnode   = require('dnode'),
        pubsub  = require('backbone-pubsub'),
        crud    = require('backbone-crud'),
        avatar  = require('backbone-avatar'),
        server  = express.createServer();
    
    server.listen(8080);
    dnode()
        .use(pubsub)
        .use(crud)
        .use(avatar)
        .listen(server);

    
At least one mongoose schema must be registered to use the CRUD
routines, .

    Mongoose = require('mongoose');
    Mongoose.connect('mongodb://localhost/db');

## Client usage

To connect to node.js and mongoose from the browser (or on the server), 
a model `type` for mongoose must be specified, as well as overriding the 
`sync` method on each model, an underscore mixin has been created to
provide optional support based on the model, in case you have different 
persistant support in mind.

    foo = Backbone.Model.extend({
        type : 'room',
        sync : _.sync
    })

You can also override the sync method globally, by overriding 
the default `Backbone.sync` method

    Backbone.sync = _.sync



## Package dependancies (npm)

* [dnode @ 0.6.10](http://github.com/substack/dnode)
* [socket.io @ 0.6.17](http://github.com/LearnBoost/Socket.IO-node)
* [backbone @ 0.3.3](http://github.com/documentcloud/backbone)
* [underscore @ 1.1.5](http://github.com/documentcloud/underscore)
* [mongoose @ 1.3.0](http://github.com/LearnBoost/mongoose)
* [connect-mongodb @ 0.3.0](http://github.com/kcbanner/connect-mongo)
* [node-gravatar @ 1.0.0](http://github.com/arnabc/node-gravatar)