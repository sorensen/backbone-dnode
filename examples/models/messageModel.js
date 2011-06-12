(function(Models) {
    // Message model
    // ------------------
    
    // Single message model
    Models.MessageModel = Backbone.Model.extend({
    
        type  : 'message',
        
        // Default model attributes
        defaults : {
            text     : '',
            username : ''
        },
        
        // Remove model along with the view
        clear : function() {
            this.view.remove();
        }
    });
    
    // Message Collection
    Models.MessageCollection = Backbone.Collection.extend({
        
        model : Models.MessageModel,
        url   : 'messages',
        type  : 'message',
        
        comparator : function(message) {
            return new Date(message.get('created')).getTime();
        }
    });

})(Models)