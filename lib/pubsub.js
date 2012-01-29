
// Module setup
// ------------

// Various pub/sub based memory containers
var clients = {}
  , channels = {}
  , subscriptions = {}
  , pub
  , sub
  , whitelist = false

// Server to client method mapping
var map = {
  'create': 'created'
, 'update': 'updated'
, 'delete': 'deleted'
}

//###pushed
// Common data pushing to client for both redis and single 
// threaded pubsub, emit the event to all connected clients 
// in this thread subscribed to the channel by directly calling
// the client-side RPC method
function pushed(model, opt) {
  if (!model || !opt.url || !channels[opt.url]) return
  var method = map[opt.method]
  if (!method) return

  if (whitelist && !~whitelist.indexOf(opt.type)) {
    return opt.error('invalid model type')
  }

  channels[opt.url] && channels[opt.url].forEach(function(x) {
    clients[x] && clients[x][method](model, opt)
  })
}

// Middleware
// -----------

// Add to the main namespace with the Pubsub middleware
// for DNode, accepts a socket client and connection
module.exports = function(options) {
  options || (options = {})
  options.publish && (pub = options.publish)
  options.subscribe && (sub = options.subscribe)
  options.whitelist && (whitelist = options.whitelist)
  
  //###Redis configuration
  if (sub) {
    // Someone has called a CRUD event on a model
    sub.on('message', function(chan, message) {
      var msg = JSON.parse(message)
        , opt = msg.options
      
      if (opt.url !== chan) return
      pushed(msg.model, msg.options)
    })

    // Someone has subscribed to a collection or model, pass the 
    // event to all clients connected to the current thread through 
    // the internal client cache
    sub.on('subscribe', function(chan, count) {
      if (!channels[chan]) return
      channels[chan].forEach(function(x) {
        clients[x] && clients[x].subscribed(chan, count)
      })
    })
    
    // Someone has unsubscribed from a collection or model, pass the 
    // event to all clients connected to the current thread through 
    // the internal client cache
    sub.on('unsubscribe', function(chan, count) {
      if (!channels[chan]) return
      channels[chan].forEach(function(x) {
        clients[x] && clients[x].unsubscribed(chan, count)
      })
    })
  }

  return function(client, con) {
    var self = this
    
    // Client connected, add them to the internal client cache
    // via the connection id
    con.on('ready', function() {
      clients[con.id] = client
    })
    
    // Client disconnected, remove them from the internal client cache
    // via the connection id, as well as removing them from the internal
    // channel and subscription cache
    con.on('end', function() {
      delete clients[con.id]
      subscriptions[con.id] && subscriptions[con.id].forEach(function(x) {
        var k = channels[x].indexOf(con.id)
        if (!!~k) channels[x].splice(k, 1)
      })
      delete subscriptions[con.id]
      sub && sub.unsubscribe()
    })
    
    //###subscribe
    // Subscribe to a model/collection via the `url`, adding to the clients subscribed 
    // channels, as well as the channels subscribed channels for internal use
    // if a redis connection has been supplied, issue the command, otherwise handle
    // it internally.
    this.subscribe = function(chan, fn) {
      if (!chan) return (fn && fn('missing parameters'))
      
      // Add client to channels
      channels[chan] || (channels[chan] = [])
      !!~channels[chan].indexOf(con.id) || channels[chan].push(con.id)
      
      // Add channel to client subscriptions
      subscriptions[con.id] || (subscriptions[con.id] = [])
      !!~subscriptions[con.id].indexOf(chan) || subscriptions[con.id].push(chan)
      sub && sub.subscribe(chan)
      fn && fn(null)
    }
    
    //###unsubscribe
    // Unsubscribe from a model/collection via the `url`, removing the internal 
    // reference to the channel and subscription cache, if a redis connection has
    // been passed, issue the command
    this.unsubscribe = function(chan, fn) {
      if (!chan) return (fn && fn('missing parameters'))
      // Remove connection from channel
      if (channels[chan]) {
        var k = channels[chan].indexOf(con.id)
        if (!!~k) channels[chan].splice(k, 1)
      }
      // Remove channel from subscriptions
      if (subscriptions[con.id]) {
        var k = subscriptions[con.id].indexOf(chan)
        if (!!~k) subscriptions[con.id].splice(k, 1)
      }
      sub && sub.unsubscribe(chan)
      fn && fn(null)
    }
    
    //###publish
    // Publish the event to all connected clients subscribed to the given `url`
    // if a redis connection has been passed, issue the command, otherwise send the 
    // event directly to all connected clients in this thread
    this.publish = function(model, opt, fn) {
      if (!model || !opt.url) {
        return (opt.error && opt.error('missing parameters'))
      }
      if (pub) {
        pub.publish(opt.url, JSON.stringify({
          model: model
        , options: opt
        }))
      } else {
        pushed(model, opt)
      }
      fn && fn(null)
    }
  }
}
