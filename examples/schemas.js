// Mongoose ORM Schemas
// --------------------

// Exports for CommonJS
var Schemas;
if (typeof exports !== 'undefined') {
    Mongoose = require('mongoose');
    Schema   = Mongoose.Schema;
    ObjectId = Schema.ObjectId;
    Schemas  = module.exports = {};
}

// Keyword extractor for mongo searchability
function extractKeywords(text) {
  if (!text) return [];

  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(function(v) { return v.length > 2; })
    .filter(function(v, i, a) { return a.lastIndexOf(v) === i; });
}
    
// Basic schema definitions initialized here, schema 
// methods and custom getters/setters that interact with 
// other schemas / models will need them to be defined first
Schemas = {

    // Basic message
    Message : new Schema({
        room     : { type : String, index : true },
        text     : String,
        username : String,
        created  : { type : Date, default : Date.now },
        modified : { type : Date, default : Date.now }
    }),

    // Chat room
    Room : new Schema({
        name        : { type : String, index : { unique : true } },
        slug        : { type : String, index : { unique : true } },
        keywords    : [String],
        description : String,
        created     : { type : Date, default : Date.now },
        modified    : { type : Date, default : Date.now }
    }),
    
    // Session defined to match connect-mongodb package sessions, 
    // to allow tighter integration between Express / Mongoose, 
    // which will ultimately trickle down to Backbone ease-of-use
    Session : new Schema({
        _id     : String,
        session : { type : String, get : function() {
            return JSON.parse(this.session);
        }},
        expires : Number
    })
};

Schemas.Room
    .pre('save', function(next) {
        this.set('modified', new Date());
        var keywords  = extractKeywords(this.name),
            descwords = extractKeywords(this.description),
            concat    = keywords.concat(descwords);
        
        this.keywords = _.unique(concat);
        next();
    });
    
Schemas.Room
    .path('name')
    .set(function(v){
        this.slug = v
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .replace(/-+/g, '');
            
        return v;
    });

// Set models to mongoose
Mongoose.model('room',         Schemas.Room);
Mongoose.model('message',      Schemas.Message);
Mongoose.model('session',      Schemas.Session);

