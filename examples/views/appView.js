(function(Views) {
    // Application view
    // -----------------
    
    // Application
    Views.ApplicationView = Backbone.View.extend({
    
        // DOM attributes
        template             : _.template($('#application-template').html()),
        statsTemplate        : _.template($('#application-stats-template').html()),
        createRoomTemplate   : _.template($('#create-room-template').html()),
        
        // Interaction events
        events    : {
            'click #show-rooms'  : 'showRooms',
            'keyup'              : 'hideOnEscape',
            'click .cancel'      : 'hideDialogs',
            'click #overlay'     : 'hideDialogs',
            
            // Create new room form
            'click #create-room'               : 'showCreateRoom',
            'click #create-room-form .submit'  : 'createRoom',
            'keypress #create-room-form input' : 'createRoomOnEnter',
            
            // Search form
            'keypress #search'  : 'searchOnEnter',
            'click #search-now' : 'searchOnEnter'
        },
        
        // Constructor
        initialize : function(options) {
            _.bindAll(this, 
                'render', 'toggleNav',
                'addRoom', 'showCreateRoom', 
                'createRoom', 'allRooms', 'roomsReady',
            );

            // Set the application model directly, since there is a 
            // one to one relationship between the view and model
            this.model = new Models.ApplicationModel({
            
                // This can be used to represent different
                // servers, or instances of the program, since
                // it is the base ID of every model url path
                server : 's1'
            });
            this.model.view = this;
            
            // Application model event bindings
            this.model.bind('change', this.render);
            this.model.bind('subscribe', this.ready);
            
            // Room collection event bindings
            this.model.rooms.bind('subscribe', this.roomsReady);
            this.model.rooms.bind('add', this.addRoom);
            this.model.rooms.bind('add', this.render);
            this.model.rooms.bind('change', this.render);
            this.model.rooms.bind('refresh', this.allRooms);
            this.model.rooms.bind('refresh', this.render);
            
            // Render template contents
            var content = this.model.toJSON();
            var view = Mustache.to_html(this.template(), content);
            this.el.html(view);
            
            // Assign pre-pouplated locals from Express
            this.sid              = token;
            this.port             = port;
            
            // Set shortcuts to collection DOM
            this.searchInput      = this.$('#search');
            this.roomList         = this.$('#rooms');
            this.sidebar          = this.$('#sidebar');
            this.mainContent      = this.$('#main-content');
            this.createRoomDialog = this.$('#create-room-dialog');
            this.overlay          = this.$('#overlay');
            
            // Navigation items for authentication toggling
            this.nav = {
                createRoom : this.$('#create-room')
            };
        },
        
        // Close modal keystroke listener
        hideOnEscape : function(e) {
            if (e.keyCode == 27) {
                this.hideDialogs();
            }
        },
        
        // Refresh statistics
        render : function() {
            var totalOnline = this.model.online       || 0;
            var totalRooms  = this.model.rooms.length || 0;
            
            this.$('#app-stats').html(Mustache.to_html(this.statsTemplate(), {
                totalOnline : totalOnline,
                totalRooms  : totalRooms
            }));
            return this;
        },
        
        // The model has been subscribed to, and is now
        // synchronized with the server
        ready : function() {
        
        },
        
        // Create room keystroke listener, throttled function
        // returned to reduce load on the server
        searchOnEnter : _.debounce(function() {
            var self = this;
            var input = this.searchInput.val();
            var query = (input.length < 1) ? {} : {
                keywords : { $in : [ input ] }
            };
            
            this.model.rooms.fetch({
                query : query,
                error : function(code, msg, opt) {
                },
                finished : function(resp) {
                }
            });
            
        }, 1000),
        
        // Create room keystroke listener, throttled function
        // returned to reduce load on the server
        searchOnTab : function(e) {
            if (e.keyCode === $.ui.keyCode.TAB && $(this).data('autocomplete').menu.active) {
                event.preventDefault();
            }
        },
        
        // Remove all defined dialoges from the view
        hideDialogs : function() {
            this.createRoomDialog.hide();
            this.overlay.hide();
        },
        
        // Room collection has been subscribed to
        roomsReady : function() {
        
        },
        
        // All rooms have been loaded into collection
        allRooms : function(rooms) {
            this.roomList.html('');
            this.model.rooms.each(this.addRoom);
            
            // Refresh model statistics
            this.render();
        },
        
        // Show the sidebar user list
        showRooms : function() {
            this.userList.fadeOut(150);
            this.roomList.fadeIn(150);
        },
        
        // Add a single room room to the current veiw
        addRoom : function(room) {
            var view = new Views.RoomView({
                model : room
            }).render();
            
            this.roomList
                .append(view.el);
        },
        
        deactivateRoom : function() {
            this.mainContent
                .fadeOut(50, function(){
                    $(this).html('');
                });
            
            // Join Channel
            this.activeRoom && this.activeRoom.remove();
        },
        
        activateRoom : function(params) {
            // Should probably hide room instead, maybe 
            // minimize it to the bottom toolbar
            this.deactivateRoom();
            
            
            // Get model by slug
            var model = this.model.rooms.filter(function(room) {
                return room.get('slug') === params;
            });
            if (!model || !model[0]) {
                Backbone.history.saveLocation('/');
                return;
            }
            
            // Create a new main room view
            this.activeRoom = new Views.RoomMainView({
                model : model[0]
            }).render();
            
            var self = this;
            this.mainContent
                .fadeIn(75, function(){
                    $(this).html(self.activeRoom.el);
                    self.activeRoom.messageList.scrollTop(
                    
                        // Scroll to the bottom of the message window
                        self.activeRoom.messageList[0].scrollHeight
                    );
                    delete self;
                })
                .find('input[name="message"]').focus();
            
            model[0].view && model[0].view.activate();
        },
        
        // Create new room room
        createRoom : function() {
            // User input
            var name        = this.$('input[name="room"]'),
                description = this.$('textarea[name="description"]');
            
            // Validation
            if (!name.val()) return;
            
            // Delegate to Backbone.sync
            this.model.createRoom({
                name        : name.val(),
                user_id     : window.user.get('id') || window.user.id,
                description : description.val()
            });
            
            // Should probably pass this in a success function
            this.createRoomDialog.fadeOut(150);
            this.overlay.hide();
            
            // Reset fields
            name.val('');
            description.val('');
        },
        
        // Create room keystroke listener
        createRoomOnEnter : function(e) {
            if (e.keyCode == 13) this.createRoom();
        },
        
        // Show the login form
        showCreateRoom : function() {
            this.hideDialogs();
            this.overlay.fadeIn(150);
            this.createRoomDialog
                .html(Mustache.to_html(this.createRoomTemplate()))
                .fadeIn(150, function(){
                })
                .find('input[name="room"]').focus();
        }
        
    });
})(Views)