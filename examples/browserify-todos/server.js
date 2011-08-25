
// Browserify Server
// =================

require.paths.unshift(__dirname);

// Dependencies
// ------------

// Include all project dependencies
var express      = require('express'),
    Mongoose     = require('mongoose'),
    Schema       = Mongoose.Schema
    middleware   = require('../../'),
    DNode        = require('dnode'),
    browserify   = require('browserify'),
    app          = module.exports = express.createServer();

// Configuration
// -------------

// General settings
var port   = 3000,
    dbpath = 'mongodb://localhost/db';

// Configure our browserified bundles, seperating them out to 
// related packages for ease of development and debugging
var core = browserify({
    ignore : [
        'underscore',
        'backbone',
    ],
    require : [
        'dnode',
        '../../'
    ],
    mount : '/example.js'
});

// Server configuration, set the server view settings to 
// render in jade, set the session middleware and attatch 
// the browserified bundles to the app on the client side.
app.configure(function() {
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.methodOverride());

    app.use(express.static(__dirname));
    app.use(express.static(__dirname + '/../../'));

    app.use(express.errorHandler({
        dumpExceptions : true, 
        showStack      : true 
    }));
    app.use(core);
});

// Start up the application and connect to the mongo 
// database if not part of another module or clustered, 
// configure the Mongoose model schemas, setting them to 
// our database instance. The DNode middleware will need 
// to be configured with the database references.
database = Mongoose.connect(dbpath);

var TodoSchema = new Schema({
    content : String,
    done    : Boolean,
    order   : Number
});
database.model('todo', TodoSchema);

middleware.crud.config(database);

// Routes
// ------

// Main application
app.get('/', function(req, res) {
    res.render('index.jade');
});

// Initialize
// ----------

// Start up the server
app.listen(port);

// Attatch the DNode middleware and connect
DNode()
    .use(middleware.pubsub) // Pub/sub channel support
    .use(middleware.crud)   // Backbone integration
    .listen(app)            // Start your engines!
