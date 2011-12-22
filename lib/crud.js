
// Backbone CRUD support
// ---------------------

var _ = require('underscore')._

function shim(data) {
  if (!data) return null
  if (data instanceof Array) {
    return data.map(function(doc) { 
      return doc.toObject()
    })
  }
  return data.toObject()
}

module.exports = function(options) {
  options || (options = {})
  var mongoose = options.database

  return function(client, con) {
    var self = this

    this.create = function(data, opt, fn) {
      if (!data || data._id || !opt.type)  {
        return opt.error('invalid parameters')
      }
      var model = mongoose.model(opt.type)
        , doc = new model(data)

      doc.save(function(err) {
        if (err) return opt.error(err, data, opt)
        if (!opt.silent && self.publish) self.publish(shim(doc), opt)
        fn && fn(shim(doc))
      })
    }
    
    this.read = function(opt, fn) {
      if (!opt.type || 'function' !== typeof fn) {
        return opt.error('invalid parameters')
      }
      opt.fields || (opt.fields = [])
      opt.sorting || (opt.sorting = {})
      opt.query || (opt.query = {})

      var model = mongoose.model(opt.type)
      if (opt.query.id) {
        model.findOne(opt.query, function(err, doc) {
          if (err) return opt.error(err)
          fn(shim(doc))
        })
        return
      }
      model.find(opt.query, opt.fields, opt.sorting, function(err, docs) {
        if (err) return opt.error(err)
        fn(shim(docs))
      })
    }
    
    this.update = function(data, opt, fn) {
      if (!data || !data._id || !opt.type) {
        return opt.error('invalid parameters')
      }
      var model = mongoose.model(opt.type)
      model.findById(data._id, function(err, doc) {
        if (err) return opt.error(err)
        if (!doc) return opt.error('model not found')

        delete data._id
        _.extend(doc, data)
        
        doc.save(function(err) {
          if (err) return opt.error(err)
          if (!opt.silent && self.publish) self.publish(shim(doc), opt)
          fn && fn(shim(doc))
        })
      })
    }
    
    this.delete = function(data, opt, fn) {
      if (!data || !data._id || !opt.type) {
        return opt.error('invalid parameters')
      }
      var model = mongoose.model(opt.type)
      model.findById(data._id, function(err, doc) {
        if (err) return opt.error(err)
        if (!doc) return opt.error('model not found')

        doc.remove(function(err) {
          if (err) return opt.error(err)
          if (!opt.silent && self.publish) self.publish(shim(doc), opt)
          fn && fn(shim(doc))
        })
      })
    }
  }
}
