
// Basic Server
// ============

require.paths.unshift(__dirname + '/lib');

// Dependencies
// ------------

// Include all project dependencies
var express    = require('express'),
    Mongoose   = require('mongoose'),
    Schema     = Mongoose.Schema,
    middleware = require('../../'),
    DNode      = require('dnode'),
    app        = module.exports = express.createServer();

// Configuration
// -------------

// Settings
var port         = 3000,
    dbpath       = 'mongodb://localhost/db',
    redisConfig  = {
        port     : 6379,
        host     : '127.0.0.1'
    };

// Server configuration
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
});

// Routes
// ------

// Main application
app.get('/', function(req, res) {
    res.render(__dirname + '/index.html');
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

// Initialize
// ----------

// Start up the server
app.listen(port);

// Attatch the DNode middleware and connect
DNode()
    .use(middleware.pubsub) // Pub/sub channel support
    .use(middleware.crud)   // Backbone integration
    .listen(app)            // Start your engines!
