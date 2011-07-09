//    Backbone-DNode
//    (c) 2011 Beau Sorensen
//    Backbone-DNode may be freely distributed under the MIT license.
//    For all details and documentation:
//    https://github.com/sorensen/backbone-dnode

module.exports.avatar = require('./lib/backbone-avatar');
module.exports.pubsub = require('./lib/backbone-pubsub');
module.exports.crud   = require('./lib/backbone-crud');
module.exports.browser = {
    avatar : require('./browser/avatar.dnode'),
    pubsub : require('./browser/pubsub.dnode'),
    crud   : require('./browser/crud.dnode')
};