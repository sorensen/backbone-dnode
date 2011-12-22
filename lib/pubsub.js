
// Publish Subscribe middleware
// ----------------------------

var _ = require('underscore')._

  // Various pub/sub based memory containers
var clients = {}
  , channels = {}
  , subscriptions = {}
  , pub
  , sub

function pushed(model, opt) {
  if (!model || !opt.url || !channels[opt.url]) return
  channels[opt.url] && channels[opt.url].forEach(function(x) {
    clients[x] && clients[x].published(model, opt)
  })
}

// Redis subscribe event handling
function configRedis() {
  if (!sub) return

  sub.on('message', function(chan, message) {
    var msg = JSON.parse(message)
      , opt = msg.options
    
    if (opt.url !== chan) return
    pushed(msg.model, msg.options)
  })

  sub.on('subscribe', function(chan, count) {
    if (!channels[chan]) return
    channels[chan].forEach(function(x) {
      clients[x] && clients[x].subscribed(chan, count)
    })
  })
  
  sub.on('unsubscribe', function(chan, count) {
    if (!channels[chan]) return
    channels[chan].forEach(function(x) {
      clients[x] && clients[x].unsubscribed(chan, count)
    })
  })
}

// Add to the main namespace with the Pubsub middleware
// for DNode, accepts a socket client and connection
module.exports = function(options) {
  options || (options = {})
  options.publish && (pub = options.publish)
  options.subscribe && (sub = options.subscribe)
  configRedis()

  return function(client, con) {
    var self = this
    
    // Client connected
    con.on('ready', function() {
      clients[con.id] = client
    })
    
    // Client disconnected
    con.on('end', function() {
      delete clients[con.id]
      subscriptions[con.id] && subscriptions[con.id].forEach(function(x) {
        var k = channels[x].indexOf(con.id)
        if (!!~k) channels[x].splice(k, 1)
      })
      delete subscriptions[con.id]
      sub && sub.unsubscribe()
    })
    
      
    this.subscribe = function(chan, fn) {
      if (!chan) return (fn && fn('missing parameters'))
      
      // Add client to channels
      channels[chan] || (channels[chan] = [])
      !!~channels[chan].indexOf(con.id) || channels[chan].push(con.id)
      
      // Add channel to client subscriptions
      subscriptions[con.id] || (subscriptions[con.id] = [])
      !!~subscriptions[con.id].indexOf(chan) || subscriptions[con.id].push(chan)
      sub && sub.subscribe(chan)
      fn && fn()
    }
    
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
      fn && fn()
    }
    
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
      fn && fn()
    }
  }
}
