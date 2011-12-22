
// Dependencies
var assert = require('assert')
  , Mongoose = require('mongoose')
  , DNode = require('dnode')
  , util = require('util')
  , Backbone = require('backbone')
  , _ = require('underscore')._
  , CRUD = require('../lib/crud')
  , middleware = require('../browser/dnode.backbone')

// Settings
var port = 9999
  , Schema = Mongoose.Schema
  , ObjectId = Schema.ObjectId
  , server
  , BlogPost
  , Blog
  , Model

// Database
var db = Mongoose.connect('mongodb://localhost/backbone_dnode_test')

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

// Basic DB cleanup method
function cleanUp(done) {
  Blog.find({}, function(err, docs) {
    if (err || !docs.length) return done(err)
    var l = docs.length
      , x = 0
    
    docs.forEach(function(doc) {
      doc.remove(function(err) {
        x += 1
        if (err) return done(err)
        if (x === l) return done()
      })
    })
  })
}

describe('CRUD', function() {

  before(cleanUp)
  after(cleanUp)

  // Make sure we can connect to DNode
  describe('#connect()', function() {
    it('should connect to DNode', function(done) {
      DNode()
        .use(function(client, conn) {
          conn.on('ready', function() {
            done()
          })
        })
        .connect(port)
    })
  })

  // CRUD testing
  describe('DNode middleware', function() {
    it('should inject the CRUD middleware', function(done) {
      DNode()
        .use(middleware())
        .use(function(client, conn) {
          conn.on('ready', function() { 
            runTests(done) 
          })
        })
        .connect(port)
    })
  })
})

function runTests(done) {
  done()

  var apple = new Model()
  var fruits = new Collection()
  var blog = new Blog({
    title: 'raw'
  , count: 1337
  })

  // Creation test
  describe('#create()', function() {
    it('creates a new backbone model', function(done) {

      apple.save({ 
        title: 'creating'
      , count: 42
      }, { 
        finished: function() { done() }
      , error: function(model, resp) { done(new Error(resp)) }
      })

      // Updating test
      describe('#update()', function() {
        assert.deepEqual(typeof apple.get('title'), 'string')
        assert.deepEqual(typeof apple.get('count'), 'number')
        assert.deepEqual(apple.get('title'), 'creating')
        assert.deepEqual(apple.get('count'), 42)

        it('should update the record', function(done) {
          apple.save({ title: 'updating' }, { 
            finished: function() { done() }
          , error: function(model, resp) { done(new Error(resp)) }
          })

          describe('mongoose#create()', function() {
            assert.deepEqual(apple.get('title'), 'updating')
  
            it('should have manually created a record', function(done) {
              blog.save(function(err) {
                done(err)
              })

              // Read / fetching test
              describe('#read()', function() {
                it('should read all records', function(done) {
                  fruits.fetch({
                    success: function(model, resp) {
                      assert.deepEqual(Object.prototype.toString.call(resp), '[object Array]')
                      assert.equal(resp.length, 2)
                      done()
                    }
                  , error: function(model, resp) { done(new Error(resp)) }
                  })

                  describe('#destroy()', function() {
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

                      describe('#read()', function() {
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
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })
}
