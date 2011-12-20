
(function() {
  
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

  // Wrap an optional success callback with a fallback success event.
  var wrapFinished = function(onFinished, model, options) {
    return function(resp) {
      if (onFinished) onFinished(model, resp, options)
      else model.trigger('success', model, resp, options)
    }
  }

  function middleware(options) {
    options || (options = {})
    options.pubsub && (pubsub = options.pubsub)

    return function(client, con) {
      server = client

      _.extend(this, {
      
        created: function(resp, options) {
          var model = cache[options.channel]
          if (model instanceof Backbone.Model) {
            model.set(model.parse(resp))
          } else if (model instanceof Backbone.Collection) {
            if (!model.get(resp.id)) model.add(model.parse(resp))
          }
        }
        
      , read: function(resp, options) {
          var model = cache[options.channel]
          if (model instanceof Backbone.Model) {
            model.set(model.parse(resp))
          } else if (model instanceof Backbone.Collection) {
            if (_.isArray(resp)) {
              model.reset(model.parse(resp))
            } else if (!model.get(resp.id)) {
              model.add(model.parse(resp))
            }
          }
        }
        
      , updated: function(resp, options) {
          var model = cache[options.channel]
          if (model.get(resp.id)) {
            model.get(resp.id).set(model.parse(resp))
          } else {
            model.set(model.parse(resp))
          }
        }
        
      , deleted: function(resp, options) {
          var model = cache[options.channel]
          if (model instanceof Backbone.Model) {
            model.trigger('destroy', model, model.collection, options)
            delete cache[options.channel]
          } else if (model instanceof Backbone.Collection) {
            if (model.get(resp.id)) {
              model.trigger('destroy', model.get(resp.id), model, options)
            }
          }
        }

      , subscribed: function(channel, online) {
          cache[channel] && cache[channel].trigger('subscribe', online)
        }
      
      , unsubscribed: function(channel, online) {
          cache[channel] && cache[channel].trigger('unsubscribe', online)
        }
        
      , published: function(resp, options) {
          if (!options.channel) return
          switch (options.method) {
            case 'create': this.created(resp, options) ;break
            case 'update': this.updated(resp, options) ;break
            case 'delete': this.deleted(resp, options) ;break
          }
        }
      })
    }
  }
  
  _.mixin({
    getUrl: function(object) {
      if (!(object && object.url)) return null
      return _.isFunction(object.url) ? object.url(): object.url
    }
  
  , sync: function(method, model, options) {
      // Remove the Backbone id from the model as not to conflict with 
      // Mongoose schemas, it will be re-assigned when the model returns
      // to the client side
      if (model.attributes && model.attributes._id) delete model.attributes.id

      // Set the RPC options for model interaction
      options.type || (options.type = model.type || model.collection.type)
      options.method = method
      options.finished = wrapFinished(options.finished, model, options)
      options.channel || (options.channel = (model.collection) 
        ? _.getUrl(model.collection) 
        : _.getUrl(model))

      if (!server) return options.error(new Error('no connection'))
      if (method === 'read') {
        server.read(options, function(resp) {
          options.success(resp)
        })
        return
      }
      server[method](model.toJSON(), options, function(resp) {
        if (!pubsub) options.success(resp)
        options.finished(resp)
      })
    }
  })
  
  // Extend default Backbone functionality
  _.extend(Backbone.Model.prototype, {
    url: function() {
      var base = _.getUrl(this.collection) || this.urlRoot || ''
      if (this.isNew()) return base
      return base + (base.charAt(base.length - 1) == ':' ? '': ':') + encodeURIComponent(this.id)
    }
  })
  
  // Common extention object for both models and collections
  var common = {
    connection: server
  
  , subscribe: function(opt, fn) {
      opt || (opt = {})
      if (!server) return (fn && fn(new Error('no connection')))
      var channel = opt.channel || (this.collection) 
        ? _.getUrl(this.collection) 
        : _.getUrl(this)
      
      if (!cache[channel]) cache[channel] = this
      server.subscribe(channel, fn)
      return this
    }
    
  , unsubscribe: function(opt, fn) {
      opt || (opt = {})
      if (!server) return (fn && fn(new Error('no connection')))
      var channel = (channel || (this.collection) 
        ? _.getUrl(this.collection)
        : _.getUrl(this))

      delete cache[channel]
      server.unsubscribe(channel, fn)
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
