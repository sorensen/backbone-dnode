// Application Server
// ------------------

// Project dependencies
var express      = require('express'),
    SessionStore = require('connect-mongodb'),
    Mongoose     = require('mongoose');
    PubSub       = require('protocol-pubsub'),
    CRUD         = require('protocol-crud'),
    DNode        = require('dnode'),
    port         = 8080,
    oneYear      = 31557600000,
    server       = module.exports = express.createServer();

// General server configuration, set our common
// configurations here that will be used in both
// production and development
server.configure(function() {
    server.use(express.bodyParser());
    server.use(express.cookieParser());
    server.use(express.methodOverride());
    server.set('view engine', 'jade');
    server.set('view options', {
        // Layouts are not required for the 
        // server, since it is a single
        // page application
        layout : false
    });
    
    // Session settings
    server.use(express.session({
        cookie : {maxAge : 60000 * 60 * 1},    // 1 Hour
        secret : 'abcdefghijklmnopqrstuvwxyz', // Hashing salt
        store  : new SessionStore({
            dbname   : 'db',
            username : '',
            password : ''
        })
    }));
});

// Development specific configurations
server.configure('development', function(){
    app.use(express.static(__dirname + '/public'));
    app.use(express.errorHandler({
        // Make sure we can see our errors
        // and stack traces for debugging
        dumpExceptions : true, 
        showStack      : true 
    }));
});

// Production specific configurations
server.configure('production', function(){
    app.use(express.static(__dirname + '/public', {
        // Set the caching lifetime
        maxAge: oneYear 
    }));
    app.use(express.errorHandler());
});

// Main application route, since this is a single
// page app, we don't need more than the single
// route, more may be added later for things like
// authentication, or file uploads
server.get('/', function(req, res) {
    res.render('index.jade', {
        locals : {
            // Add local variables here as
            // needed, such as version number, 
            // session ID, or auth tokens
            port : port
        }
    });
});

// Start the application by attatching the 
// express server to the given port, and 
// providing DNode with our modular logic, 
// then attatching it to the server
server.listen(port);
DNode()
    .use(PubSub)    // Pub/sub channel support
    .use(CRUD)      // Backbone integration
    .listen(server) // Start your engines!