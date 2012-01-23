
var mongoose = require('mongoose')
  , db = mongoose.connect(process.env.MONGO_DB_URI || 'mongodb://localhost/backbone_dnode_test')

module.exports = {
  db: db
}
