(function(Views) {
    // Room room views
    // -----------------
    
    // Both the simple 'Room' view and the full 'MainRoom'
    // view share the same room model, with the main difference
    // being that the 'Room' view does not hold a message
    // collection, and provides different updates
    
    // Room room
    Views.RoomView = Backbone.View.extend({
    
        // DOM attributes
        tagName        : 'div',
        className      : 'room inactive',
        template       : _.template($('#room-list-template').html()),
        
        // Constructor
        initialize : function(options) {
            // Bind to model
            _.bindAll(this, 'render', 'remove');
            
            this.model.view = this;
            this.model.bind('change', this.render);
            this.model.bind('remove', this.remove);
            
            // Send model contents to the template
            var content = this.model.toJSON();
            
            // Pre-rendering formatting to prevent XSS
            content.name = this.model.escape('name');
            content.description = this.model.escape('description');
            
            var view = Mustache.to_html(this.template(), content);            
            $(this.el).html(view);
        },
        
        // Refresh statistics
        render : function() {
        },
        
        // Remove this view from the DOM.
        remove : function() {
            $(this.el).remove();
        },
        
        // Join Channel
        activate : function() {            
            $(this.el)
                .addClass('active')
                .addClass('current')
                .removeClass('inactive')
                .siblings()
                .addClass('inactive')
                .removeClass('current');
        },
        
        // Leave Channel
        deactivate : function() {            
            $(this.el)
                .removeClass('active')
                .removeClass('current')
                .addClass('inactive');
        },
    });
    
    // Room room
    Views.RoomMainView = Backbone.View.extend({
    
        // DOM attributes
        tagName        : 'div',
        className      : 'main-room',
        template       : _.template($('#room-template').html()),
        statsTemplate  : _.template($('#room-stats-template').html()),
        
        // Interaction events
        events    : {
            'keypress .message-form input' : 'createMessageOnEnter',
            'click .message-form button'   : 'createMessage',
            'click .destroy'               : 'deactivate',
        },
        
        // Constructor
        initialize : function(options) {
            
            _.bindAll(this, 
                'allMessages', 'addMessage', 'createMessage', 'render',
                'remove'
            );
            
            // Bind to model
            this.model.mainView = this;
            this.model.bind('change', this.render);
            this.model.bind('remove', this.remove);
            
            this.model.messages = new Models.MessageCollection();
            this.model.messages.url = Helpers.getUrl(this.model) + ':messages';
            
            this.model.messages.bind('add', this.addMessage);
            this.model.messages.bind('refresh', this.allMessages);
            this.model.messages.bind('add', this.render);
            
            // Send model contents to the template
            var content = this.model.toJSON(),
                self    = this;
            
            // Pre-formatting to prevent XSS
            content.name = this.model.escape('name');
            content.description = this.model.escape('description');
            
            var view = Mustache.to_html(this.template(), content);            
            $(this.el).html(view);
            
            // Set shortcut methods for DOM items
            this.title       = this.$('.headline');
            this.controls    = this.$('.controls');
            this.description = this.$('.description');
            this.input       = this.$('.create-message');
            this.messageList = this.$('.messages');
            
            // Post-formatting, done here as to prevent conflict
            // with Mustache HTML entity escapement
            this.title.html(Helpers.linkify(self.model.escape('name')));
            this.description.html(Helpers.linkify(self.model.escape('description')));
            
            this.model.messages.subscribe({}, function() {
                self.model.messages.fetch({
                    query    : {room_id : self.model.get('id')},
                    sorting  : {sort: [['created',-1]], limit: 20},
                    finished : function(data) {
                    },
                });
            });
            
            this.input.focus();
        },
        
        deleteRoom : function() {
            this.model.destroy();
        },
        
        // Refresh statistics
        render : function() {
            var totalMessages = this.model.messages.length;
            this.$('.room-stats').html(Mustache.to_html(this.statsTemplate(), {
                totalMessages : totalMessages
            }));
            return this;
        },
        
        // Tell the application to remove this room
        deactivate : function() {
            Backbone.history.saveLocation('/');
            Application.deactivateRoom(this.model);
        },
        
        // Remove this view from the DOM, and unsubscribe from 
        // all future updates to the message collection
        remove : function() {
            this.model.view && this.model.view.deactivate();
            this.model && this.model.remove();
            this.model.messages.unsubscribe();
            $(this.el).remove();
        },
        
        // All rooms have been loaded into collection
        allMessages : function(messages) {
            this.messageList.html('');
            this.model.messages.each(this.addMessage);
            this.render()
                .messageList
                .delay(400)
                .animate({scrollTop : this.messageList[0].scrollHeight}, 1000, 'easeInExpo');
        },
        
        addMessage : function(message) {
            var view = new Views.MessageView({
                model : message
            }).render();
            
            this.model.view && this.model.view.highlight();
            this.messageList.append(view.el)
                .scrollTop(this.messageList[0].scrollHeight);
        },
        
        // Send a message to the server
        createMessage : function() {
            if (!this.input.val()) return;
            this.model.messages.create(this.newAttributes());
            this.input.val('');
        },
        
        // Create message keystroke listener
        createMessageOnEnter : function(e) {
            if (e.keyCode == 13) this.createMessage();
        },
        
        // Generate the attributes
        newAttributes : function() {
            var username = window.user.get('username');
            var id = window.user.get('id') || window.user.id;
            
            return {
                text        : this.input.val(),
                room_id     : this.model.get('id'),
                username    : (username == Models.UserModel.defaults) ? id : window.user.get('username'),
                displayName : window.user.get('displayName') || window.user.get('username'),
            };
        },
    });
    
})(Views)