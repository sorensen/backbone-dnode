//    Aebleskiver
//    (c) 2011 Beau Sorensen
//    Aebleskiver may be freely distributed under the MIT license.
//    For all details and documentation:
//    https://github.com/sorensen/aebleskiver

module.exports.pubsub = require('./lib/backbone-pubsub');
module.exports.crud   = require('./lib/backbone-crud');
module.exports.avatar = require('./lib/backbone-avatar');
model.exports.browser = {
    pubsub : require('./browser/backbone.dnode'),
    crud   : require('./browser/backbone.dnode'),
    avatar : require('./browser/backbone.dnode')
};