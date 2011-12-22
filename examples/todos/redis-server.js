
// Basic Server
// ============

// Include all project dependencies
var express = require('express')
  , Mongoose = require('mongoose')
  , DNode = require('dnode')
  , Redis = require('redis')
  , Schema = Mongoose.Schema
  , BackboneDNode = require(__dirname + '/../../')
  , app = module.exports = express.createServer()

// Server configuration
app.configure(function() {
  app.use(express.bodyParser())
  app.use(express.cookieParser())
  app.use(express.methodOverride())

  app.use(express.static(__dirname))
  app.use(express.static(__dirname + '/../vendor/'))
  app.use(express.static(__dirname + '/../../browser/'))

  app.use(express.errorHandler({
    dumpExceptions: true
  , showStack: true 
  }))
})

// Routes
// ------

// Main application
app.get('/', function(req, res) {
  res.render(__dirname + '/index.html')
})

// Start up the application and connect to the mongo 
// database if not part of another module or clustered, 
// configure the Mongoose model schemas, setting them to 
// our database instance. The DNode middleware will need 
// to be configured with the database references.
database = Mongoose.connect('mongodb://localhost:27017/db')

var TodoSchema = new Schema({
  content: String
, done: Boolean
, order: Number
})

database.model('todo', TodoSchema)

// Redis instances for pub/sub
var pub = Redis.createClient()
  , sub = Redis.createClient()

// Initialize
// ----------

// Start up the server
app.listen(8080, function() {
  console.log("Server configured for: " + (global.process.env.NODE_ENV || 'development') + " environment.")
  console.log("Server listening on port: " + app.address().port)
})

// General error handling
function errorHandler(client, conn) {
  conn.on('error', function(e) {
    console.log('Conn Error: ', e.stack)
  })
}

// Attatch the DNode middleware and connect
DNode()
  .use(errorHandler)
  .use(BackboneDNode.pubsub({
    publish: pub
  , subscribe: sub
  }))
  .use(BackboneDNode.crud({
    database: database
  }))
  .listen(app)
