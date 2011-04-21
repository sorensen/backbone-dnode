(function(){
    // Application Server
    // ------------------
    
    // Dependencies
    var express     = require('express'),
        PubSub      = require('protocol-pubsub'),
        CRUD        = require('protocol-crud'),
        DNode       = require('dnode'),
        port        = 8080,
        server      = module.exports = express.createServer();
    
    // Server configuration
    server.configure(function() {
        server.use(express.bodyParser());
        server.use(express.methodOverride());
        server.use(express.static(__dirname + '/public'));
        server.set('view options', {layout : false});
    });
    
    // Main application
    server.get('/', function(req, res) {
        res.render('index.jade', {
            locals : {
                version : version
            }
        });
    });
    
    // Start application
    server.listen(port);
    DNode()
        .use(PubSub)    // Pub/sub channel support
        .use(CRUD)      // Backbone integration
        .listen(server) // Start your engines!
})()