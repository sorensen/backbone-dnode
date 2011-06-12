(function(Models) {
    // Room model
    // ------------------
    
    // Room room
    Models.RoomModel = Backbone.Model.extend({
    
        type  : 'room',
        
        defaults : {
            name : 'Unknown'
        },
    });
    
    // Room Collection
    Models.RoomCollection = Backbone.Collection.extend({
        
        model : Models.RoomModel,
        url   : 'rooms',
        type  : 'room',
        
        // Sorting for rankings
        comparator : function(room) {
            return new Date(room.get('created')).getTime();
        }
    });
    
})(Models)