
// Helpers
// -------

// Convert a document or an array of documents to objects,
// can also be found in the [mongoose-troop](https://github.com/tblobaum/mongoose-troop)
// project helpers
function dataToObjects(data) {
  if (!data) return null
  if (data instanceof Array) {
    return data.map(function(doc) {
      return doc.toObject()
    })
  }
  return data.toObject()
}

// Middleware
// ----------

// DNode usable middleware, main exportable method for 
// attaching all CRUD and PubSub support to the client
module.exports = function(options) {
  options || (options = {})

  var mongoose = options.database
    , whitelist = options.whitelist || false

  return function(client, con) {
    var self = this

    //###create
    // Create a new model in mongoose of the givin `type`, 
    // publishing the event to all clients. If `silent: true`
    // is passed in the options, only return a success
    this.create = function(data, opt, fn) {
      if (!data || data._id || !opt.type)  {
        return opt.error('invalid parameters')
      }
      if (whitelist && !~whitelist.indexOf(opt.type)) {
        return opt.error('invalid model type')
      }
      var model = mongoose.model(opt.type)
        , doc = new model(data)

      doc.save(function(err) {
        if (err) return opt.error(err, data, opt)
        if (!opt.silent && self.publish) self.publish(dataToObjects(doc), opt)
        fn && fn(dataToObjects(doc))
      })
    }

    //###read
    // Find all documents of the given `type`, if an `_id` is 
    // passed, only lookup the single model, otherwise, find all 
    // models matching the given `query`. Valid options include 
    // `query`, `sorting`, and `fields`.
    this.read = function(opt, fn) {
      if (!opt.type || 'function' !== typeof fn) {
        return opt.error('invalid parameters')
      }
      if (whitelist && !~whitelist.indexOf(opt.type)) {
        return opt.error('invalid model type')
      }
      opt.fields || (opt.fields = [])
      opt.sorting || (opt.sorting = {})
      opt.query || (opt.query = {})

      var model = mongoose.model(opt.type)
      if (opt.query.id) {
        model.findOne(opt.query, function(err, doc) {
          if (err) return opt.error(err)
          fn(dataToObjects(doc))
        })
        return
      }
      model.find(opt.query, opt.fields, opt.sorting, function(err, docs) {
        if (err) return opt.error(err)
        fn(dataToObjects(docs))
      })
    }

    //###update
    // Update an existing model, which must have an `_id` passed
    // in as an option, changes will be published after save unless
    // `silent: true` is passed in as an option
    this.update = function(data, opt, fn) {
      if (!data || !data._id || !opt.type) {
        return opt.error('invalid parameters')
      }
      if (whitelist && !~whitelist.indexOf(opt.type)) {
        return opt.error('invalid model type')
      }
      var model = mongoose.model(opt.type)
      model.findById(data._id, function(err, doc) {
        if (err) return opt.error(err)
        if (!doc) return opt.error('model not found')

        delete data._id
        for (var prop in data) {
          if (doc[prop] !== void 0) doc[prop] = data[prop]
        }
        doc.save(function(err) {
          if (err) return opt.error(err)
          if (!opt.silent && self.publish) self.publish(dataToObjects(doc), opt)
          fn && fn(dataToObjects(doc))
        })
      })
    }

    //###delete
    // Delete a model by `_id` only, publishing the event to all connected
    // clients unless `silent: true` is passed in as an option
    this.delete = function(data, opt, fn) {
      if (!data || !data._id || !opt.type) {
        return opt.error('invalid parameters')
      }
      if (whitelist && !~whitelist.indexOf(opt.type)) {
        return opt.error('invalid model type')
      }
      var model = mongoose.model(opt.type)
      model.findById(data._id, function(err, doc) {
        if (err) return opt.error(err)
        if (!doc) return opt.error('model not found')

        doc.remove(function(err) {
          if (err) return opt.error(err)
          if (!opt.silent && self.publish) self.publish(dataToObjects(doc), opt)
          fn && fn(dataToObjects(doc))
        })
      })
    }
  }
}
