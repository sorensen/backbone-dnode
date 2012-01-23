
// Dependencies
var assert = require('assert')
  , Mongoose = require('mongoose')
  , common = require('./support/common')
  , db = common.db
  , DNode = require('dnode')
  , Backbone = require('backbone')
  , _ = require('underscore')._
  , CRUD = require(__dirname + '/../lib/crud')
  , middleware = require(__dirname + '/../browser/dnode.backbone')

// Settings
var port = 9999
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
  .use(CRUD({
    database: db
  }))
  .listen(port)

describe('CRUD', function() {

  before(function () {
    Blog.remove(function (err) {
      assert.strictEqual(err, null)
    })
  })

  var apple = new Model()
  var fruits = new Collection()
  var blog = new Blog({
    title: 'raw'
  , count: 1337
  })

  var remote
    , connection

  // CRUD testing
  it('should inject the CRUD middleware', function(done) {
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
          assert.strictEqual(typeof conn.remote.create, 'function')
          assert.strictEqual(typeof conn.remote.read, 'function')
          assert.strictEqual(typeof conn.remote.update, 'function')
          assert.strictEqual(typeof conn.remote.delete, 'function')
          done()
        })
      })
      .connect(port)
  })

  // Creation test
  it('should create a new backbone model', function(done) {
    apple.save({ 
      title: 'creating'
    , count: 42
    }, { 
      finished: function() {
        assert.strictEqual(typeof apple.get('title'), 'string')
        assert.strictEqual(typeof apple.get('count'), 'number')
        assert.strictEqual(apple.get('title'), 'creating')
        assert.strictEqual(apple.get('count'), 42)
        done()
      }
    , error: function(model, resp) { done(new Error(resp)) }
    })
  })

  // Updating test
  it('should update the record', function(done) {
    apple.save({ title: 'updating' }, { 
      finished: function() { 
        assert.strictEqual(apple.get('title'), 'updating')
        done() 
      }
    , error: function(model, resp) { done(new Error(resp)) }
    })
  })

  it('should have manually created a record', function(done) {
    blog.save(function(err) {
      assert.strictEqual(err, null)
      done(err)
    })
  })

  // Read / fetching test
  it('should read all records', function(done) {
    fruits.fetch({
      success: function(model, resp) {
        assert.deepEqual(Object.prototype.toString.call(resp), '[object Array]')
        assert.equal(resp.length, 2)
        done()
      }
    , error: function(model, resp) { done(new Error(resp)) }
    })
  })

  it('should delete the record', function(done) {
    var l = fruits.length
      , x = 0
    
    var finished = function() {
      x += 1
      if (x === l) return done()
    }
    
    fruits.each(function(model) {
      model.destroy({
        finished: finished
      , error: function(model, resp) { done(new Error(resp)) }
      })
    })
  })

  it('should find no records', function(done) {
    fruits.fetch({
      success: function(model, resp) {
        assert.deepEqual(Object.prototype.toString.call(resp), '[object Array]')
        assert.equal(resp.length, 0)
        done()
      }
    , error: function(model, resp) { done(new Error(resp)) }
    })
  })

  it('should disconnect from DNode', function(done) {
    connection.on('end', function() {
      done()
    })
    connection.end()
  })
})
