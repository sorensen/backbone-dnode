
var cache = []

module.exports = function(options) {
  var redis = options.database
    , prefix = (options.prefix || 'online:')
    , remove = (options.remove = true)
    , offset = (options.offset = 60000 * 60 * 24)
    , interval = (options.interval = 60000 * 10)

  function clearOld(key, opt, fn) {
    if (!cache.length) return
    
    opt || (opt = {})
    opt.min || (opt.min = '-inf')
    opt.max || (opt.max = Date().getTime() - offset)
    console.log('zremrange: ', key, opt)

    cache.forEach(function (x) {
      redis.zremrangebyscore(prefix + x, opt.min, opt.max, function(err, resp) {
        console.log('zremrange done: ', err, resp)
          if ('function' !== typeof fn) return
          fn(err, resp)
      })
    })
  }

  if (remove) {
    setInterval(clearOld, interval)
  }

  return function(client, con) {

    this.clearOld = clearOld

    this.online = function(key, opt, fn) {
      opt || (opt = {})
      if ('function' !== typeof fn || !key) return
      opt.min || (opt.min = '-inf')
      opt.max || (opt.max = '+inf')
      redis.zrangebyscore(prefix + key, opt.min, opt.max, fn)
    }

    this.join = function(key, val, fn) {
      if ('string' !== typeof key) return
      if ('string' !== typeof val) return

      !~cache.indexOf(key) && cache.push(key)

      redis.zadd(prefix + key, new Date().getTime(), val, function(err, resp) {
        if ('function' !== typeof fn) return
        fn(err, resp)
      })
    }

    this.leave = function(key, val, fn) {
      if ('string' !== typeof key) return
      if ('string' !== typeof val) return
      redis.zrem(prefix + key, val, function(err, resp) {
        if ('function' !== typeof fn) return
        fn(err, resp)
      })
    }
  }
}
