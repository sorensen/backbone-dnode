
;(function() {
  // Module setup
  // ------------
  
  // Create the global default settings and cache containers, 
  // requiring all dependencies based on server or client environment
  var root = this
    , pubsub = false
    , server
    , cache = {}
  
  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore')._
  
  // Require Backbone, if we're on the server, and it's not already present.
  var Backbone = root.Backbone
  if (!Backbone && (typeof require !== 'undefined')) Backbone = require('backbone')

  // Helpers
  // -------

  // Helper function to get a value from a Backbone object as a property
  // or as a function.
  var getValue = function(object, prop) {
    if (!(object && object[prop])) return null
    return _.isFunction(object[prop]) ? object[prop]() : object[prop]
  }

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  }

  // Throw an error when no remote connection is found.
  var serverError = function() {
    throw new Error('A server connection could not be found')
  }

  // Wrap an optional success callback with a fallback success event.
  var wrapFinished = function(onFinished, model, opt) {
    return function(resp) {
      if (onFinished) onFinished(model, resp, opt)
      else model.trigger('success', model, resp, opt)
    }
  }

  // Middleware
  // -----------

  // DNode usable middleware, main exportable method for 
  // attaching all CRUD and PubSub support to the client
  function middleware(options) {
    options || (options = {})
    options.pubsub && (pubsub = options.pubsub)

    return function(client, con) {
      server = client

      //###created
      // Retrieve the model or collection from the cache based on `url`, 
      // either setting the model attributes directly, or adding
      // a new model to the collection, both use `parse()`
      this.created = function(resp, opt) {
        var model = cache[opt.url]
        if (model instanceof Backbone.Model) {
          model.set(model.parse(resp))
        } else if (model instanceof Backbone.Collection) {
          if (!model.get(resp[model.idAttribute])) model.add(model.parse(resp))
        }
      }
        
      //###read
      // Direct read handler, retrieve the model or collection from 
      // the cache based on `url`, setting model attributes directly, 
      // or adding either an array of models or a single model to the 
      // collection, both use `parse()`
      this.read = function(resp, opt) {
        var model = cache[opt.url]
        if (model instanceof Backbone.Model) {
          model.set(model.parse(resp))
        } else if (model instanceof Backbone.Collection) {
          if (_.isArray(resp)) {
            model.reset(model.parse(resp))
          } else if (!model.get(resp[model.idAttribute])) {
            model.add(model.parse(resp))
          }
        }
      }

      //###updated
      // An existing model has been changed, retrieve the model or collection
      // from the cache based on `url`, updating the model using `set()`, or 
      // locating it from the collection via `get()`, then setting. Both use `parse()`
      this.updated = function(resp, opt) {
        var model = cache[opt.url]
        if (model.get(resp[model.idAttribute])) {
          model.get(resp[model.idAttribute]).set(model.parse(resp))
        } else {
          model.set(model.parse(resp))
        }
      }
      
      //###deleted
      // A model has been deleted, retrieve it or its containing collection 
      // in the cache via the `url`, remove from the cache if direct model, 
      // then triggering a `destroy` event 
      this.deleted = function(resp, opt) {
        var model = cache[opt.url]
        if (model instanceof Backbone.Collection) {
          if (model.get(resp[model.idAttribute])) {
            model = model.get(resp[model.idAttribute])
          }
        } else {
          delete cache[opt.url]
        }
        if (model instanceof Backbone.Model) {
          model.trigger('destroy', model, model.collection, opt)
        }
      }

      //###subscribed
      // Another client has subscribed to a model or collection, retrieve 
      // it from the cache via the `url` and trigger a `subscribe` event
      this.subscribed = function(url, online) {
        cache[url] && cache[url].trigger('subscribe', online)
      }
    
      //###unsubscribed
      // Another client has unsubscribed to a model or collection, retrieve 
      // it from the cache via the `url` and trigger a `unsubscribe` event
      this.unsubscribed = function(url, online) {
        cache[url] && cache[url].trigger('unsubscribe', online)
      }
    }
  }

  // Backbone extentions
  // -------------------
  
  _.mixin({
    //###sync
    // Drop in replacement for `Backbone.sync` method to use the server-side
    // DNode middleware using the `url` for pubsub channels, triggering the `success`
    // method instantly if no pubsub is enabled, and a `finished` command if so
    //
    //     var SaladCollection = new Backbone.Collection.extend({
    //       model: LettuceModel
    //     , url: 'potato'
    //     , type: 'salad'
    //     , sync: _.sync
    //     , idAttribute: '_id'
    //     })
    //
    // Or a global override can be done on Backbone directly
    //
    //     Backbone.sync = _.sync
    sync: function(method, model, opt) {
      if (!server) return opt.error(new Error('no connection'))
      opt.type || (opt.type = model.type || model.collection.type)
      opt.method = method
      opt.finished = wrapFinished(opt.finished, model, opt)

      if (!opt.url) opt.url = getValue(model, 'url') || urlError()
      if (method === 'read') return server.read(opt, opt.success)
      server[method](model.toJSON(), opt, function(resp) {
        if (!pubsub) opt.success(resp)
        opt.finished(resp)
      })
    }
  })
  
  // Common extention object for both models and collections
  var common = {
    connection: server
  
    //###subscribe
    // Subscribe to the model or collection on the server, adding 
    // it to the local cache as well for lookup on incomming events
    // via the `url` of the object, which can be passed as an option
  , subscribe: function(opt, fn) {
      if (typeof opt === 'function') { fn = opt; opt = {} }
      opt || (opt = {})
      if (!server) serverError()
      if (!opt.url) opt.url = getValue(this, 'url') || urlError()
      if (!cache[opt.url]) cache[opt.url] = this
      server.subscribe(opt.url, fn)
      return this
    }
    
    //###unsubscribe
    // Unsubscribe from a model or collection, removing it from the local
    // cache via the `url`, which can be passed as an option directly
  , unsubscribe: function(opt, fn) {
      if (typeof opt === 'function') { fn = opt; opt = {} }
      opt || (opt = {})
      if (!server) serverError()
      if (!opt.url) opt.url = getValue(this, 'url') || urlError()
      delete cache[opt.url]
      server.unsubscribe(opt.url, fn)
      return this
    }
  }
  
  // Extend both model and collection with the pub/sub mechanics
  _.extend(Backbone.Model.prototype, common)
  _.extend(Backbone.Collection.prototype, common)
  
  // Exports
  // -------

  // Exported for both CommonJS and the browser.
  if (typeof exports !== 'undefined') module.exports = middleware
  else root.dnodeBackbone = middleware

})()
