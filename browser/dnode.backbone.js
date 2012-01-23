//    backbone-dnode
//    (c) 2012 Beau Sorensen
//    Backbone-DNode may be freely distributed under the MIT license.
//    For all details and documentation:
//    https://github.com/sorensen/backbone-dnode

// Client CRUD/Pubsub middleware
// -----------------------------

;(function() {
  
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

  // Helper function to get a value from a Backbone object as a property
  // or as a function.
  var getValue = function(object, prop) {
    if (!(object && object[prop])) return null;
    return _.isFunction(object[prop]) ? object[prop]() : object[prop];
  }

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  }

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

  // DNode configurable middleware
  function middleware(options) {
    options || (options = {})
    options.pubsub && (pubsub = options.pubsub)

    return function(client, con) {
      server = client

      _.extend(this, {
      
        created: function(resp, opt) {
          var model = cache[opt.url]
          if (model instanceof Backbone.Model) {
            model.set(model.parse(resp))
          } else if (model instanceof Backbone.Collection) {
            if (!model.get(resp[model.idAttribute])) model.add(model.parse(resp))
          }
        }
        
      , read: function(resp, opt) {
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

      , updated: function(resp, opt) {
          var model = cache[opt.url]
          if (model.get(resp[model.idAttribute])) {
            model.get(resp[model.idAttribute]).set(model.parse(resp))
          } else {
            model.set(model.parse(resp))
          }
        }
        
      , deleted: function(resp, opt) {
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

      , subscribed: function(url, online) {
          cache[url] && cache[url].trigger('subscribe', online)
        }
      
      , unsubscribed: function(url, online) {
          cache[url] && cache[url].trigger('unsubscribe', online)
        }
      })
    }
  }
  
  _.mixin({
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
  
    // Subscribe to the model or collection on the server, adding 
    // it to the local cache as well for lookup on incomming events
  , subscribe: function(opt, fn) {
      if (typeof opt === 'function') { fn = opt; opt = {} }
      opt || (opt = {})
      if (!server) serverError()
      if (!opt.url) opt.url = getValue(this, 'url') || urlError()
      if (!cache[opt.url]) cache[opt.url] = this
      server.subscribe(opt.url, fn)
      return this
    }
    
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
  
  // Exported for both CommonJS and the browser.
  if (typeof exports !== 'undefined') module.exports = middleware
  else root.dnodeBackbone = middleware

})()
