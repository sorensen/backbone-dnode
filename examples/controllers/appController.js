(function(Controllers) {
    // Application
    // ----------
    
    // Main controller and router
    Controllers.Application = Backbone.Controller.extend({
    
        // Definitions
        routes : {
            '/rooms/:id' : 'joinRoom',
            '/'          : 'home',
            '*uri'       : 'invalid'
        },
        
        initialize : function(options) {
            
            // Attach the application
            Application = this.view = new Views.ApplicationView({
                // Use existing DOM element
                el : $("#application")
            });
            
            // Circular reference
            this.view.controller = this;
            this.view.render();
        },
        
        home : function() {
            this.view.render();
            this.view.deactivateRoom();
        },
        
        // Default action
        invalid : function(uri) {
            this.saveLocation('/');
        },
        
        // Join a room room
        joinRoom : function(id) {
        
            // Make sure that the room has been 
            // loaded by the application first
            this.view.activateRoom(id);
        }
    });
    
})(Controllers)