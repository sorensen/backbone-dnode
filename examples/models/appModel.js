(function(Models) {
    // Application model
    // -----------------
    
    Models.ApplicationModel = Backbone.Model.extend({
    
        type     : 'application',
        urlRoot  : 'app',
        
        createRoom : function(attr) {
            if (!attr) return;
            this.rooms.create(attr, {
                error    : function(msg, resp, options) {},
                finished : function(resp) {
                }
            });
        },
        
        initialize : function(options) {
            
            // Active room collection
            this.rooms = new Models.RoomCollection();
            this.rooms.url = this.url() + ':rooms';
            
            // Create a new user for the current client, only the 
            // defaults will be used until the client authenticates
            // with valid credentials
            window.user = new Models.UserModel();
            
            // Wait for three executions of history() before
            // starting, ensuring that rooms and users are loaded before
            // trying to execute the current hash location
            var history = _.after(1, function() {
                Backbone.history.start();
            });
            
            // Subscribing to a model can be continued by just 
            // passing a callback, though, it will still execute a
            // 'finished' function if you pass one in theim n options
            var self = this;
            
            // Sync up with the server through DNode, Backbone will
            // supply the channel url if one is not supplied
            this.rooms.subscribe({}, function(resp) {
                self.rooms.fetch({
                    query    : {},
                    error    : function(code, msg, opt) {},
                    finished : function(resp) {
                        history();
                    },
                });
            });
            
            // Sync up with the server through DNode, Backbone will
            // supply the channel url if one is not supplied
            var params = {
                token : self.view.sid,
                error : function(code, data, options) {
                },
            };
            Server.getSession({}, params, function(session, options) {
            
                if (!session) return;
                options.password && (session.password = options.password);
                session = Helpers.getMongoId(session);
                
                window.user.set(session);
                window.user.url = self.url() + ':users:' + session.id;
                window.user.subscribe({}, function(resp) {
                
                });
                
                Server.activeSessions(function(resp) {
                    console.log('activeSessions: ', resp);
                    
                    this.online = resp.length || 0;
                });
            });
            
            // Wait a while and then force-start history, on the off chance
            // that no users or rooms were loaded
            _.delay(function() {
                try {
                    Backbone.history.start();
                } catch (error) {
                    // Error's only occur when we try to 
                    // re-start backbone history
                }
            }, 5000);
        }
    });
    
})(Models)