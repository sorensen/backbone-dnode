
// Dependencies
var assert = require('assert')
  , redis = require('redis')
  , publish = redis.createClient()
  , subscribe = redis.createClient()
  , Mongoose = require('mongoose')
  , common = require('./support/common')
  , db = common.db
  , DNode = require('dnode')
  , Backbone = require('backbone')
  , _ = require('underscore')._
  , PubSub = require(__dirname + '/../lib/pubsub')
  , middleware = require(__dirname + '/../browser/dnode.backbone')

// Settings
var port = 9998
  , Schema = Mongoose.Schema
  , ObjectId = Schema.ObjectId
  , server
  , BlogPost
  , Blog
  , Model

// Mongoose schema
BlogSchema = new Schema({
  title: String
, count: Number
})
Blog = Mongoose.model('blog', BlogSchema)

// Backbone model
Model = Backbone.Model.extend({
  type: 'blog'
, sync: _.sync
, url: 'blogtest'
, idAttribute: '_id'
})

// Backbone collection
Collection = Backbone.Collection.extend({
  model: Model
, type: 'blog'
, sync: _.sync
, url: 'blogtest'
})

// Create DNode server
server = DNode()
  .use(PubSub({
    publish: publish
  , subscribe: subscribe
  }))
  .listen(port)

describe('PubSub', function() {

  before(function () {
    Blog.remove(function(err) {
      assert.strictEqual(err, null)
    })
  })

  var apple = new Model({ hello: 'thar' })
  var fruits = new Collection()
  var blog = new Blog({
    title: 'raw'
  , count: 1337
  })

  var remote
    , connection
  
  it('should inject the PubSub middleware', function(done) {
    DNode()
      .use(middleware())
      .use(function(client, conn) {
        remote = client
        connection = conn
        assert.strictEqual(typeof this.created, 'function')
        assert.strictEqual(typeof this.read, 'function')
        assert.strictEqual(typeof this.updated, 'function')
        assert.strictEqual(typeof this.deleted, 'function')
        assert.strictEqual(typeof this.published, 'function')
        assert.strictEqual(typeof this.subscribed, 'function')
        assert.strictEqual(typeof this.unsubscribed, 'function')
    
        conn.on('ready', function() {
          assert.strictEqual(typeof conn.remote.subscribe, 'function')
          assert.strictEqual(typeof conn.remote.unsubscribe, 'function')
          assert.strictEqual(typeof conn.remote.publish, 'function')
          done()
        })
      })
      .connect(port)
  })

  it('should subscribe to the collection', function(done) {
    fruits.subscribe(function(err) {
      assert.strictEqual(err, null)
      done()
    })
  })

  it('should unsubscribe to the collection', function(done) {
    fruits.unsubscribe(function(err) {
      assert.strictEqual(err, null)
      done()
    })
  })

  it('should subscribe to the collection and trigger an event', function(done) {
    fruits.bind('subscribe', function() {
      done()
    })
    fruits.subscribe(function(err) {
      assert.strictEqual(err, null)
    })
  })

  it('should publish the model', function(done) {
    fruits.bind('add', function(model) {
      assert.deepEqual(apple.toJSON(), model.toJSON())
      done()
    })

    remote.publish(apple, {
      url: 'blogtest'
    , method: 'create'
    , error: function(err) {
        assert.strictEqual(err, null)
      }
    }, function(err) {
      assert.strictEqual(err, null)
    })
  })

  it('should disconnect from DNode', function(done) {
    connection.on('end', function() {
      done()
    })
    connection.end()
  })
})
