
// Clustered server
// ----------------

var Cluster  = require('cluster')
    Live     = require('cluster-live');

// Start the cluster
Cluster('./server')
    .set('workers', 4)
    .set('socket path', __dirname + '/socks')
    .use(Cluster.logger(__dirname + '/logs'))
    .use(Cluster.pidfiles(__dirname + '/pids'))
    .use(Cluster.cli())
    .use(Cluster.repl(8000))
    .use(Cluster.debug())
    .use(Cluster.stats({ 
        connections   : true, 
        lightRequests : true 
    }))
    .use(Live({
        port : 8080,
        host : 'localhost',
        user : '',
        pass : ''
    }))
    .listen(3000)