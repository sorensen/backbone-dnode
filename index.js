//    Aebleskiver
//    (c) 2011 Beau Sorensen
//    Aebleskiver may be freely distributed under the MIT license.
//    For all details and documentation:
//    https://github.com/sorensen/aebleskiver

module.exports.avatar = require('./lib/backbone-avatar');
module.exports.pubsub = require('./lib/backbone-pubsub');
module.exports.crud   = require('./lib/backbone-crud');
model.exports.browser = {
    avatar : require('./browser/avatar.dnode'),
    pubsub : require('./browser/pubsub.dnode'),
    crud   : require('./browser/crud.dnode')
};