(function() {
    // Bootstrap
    // ------------------
    
    // Predefine all commonly shared objects and storage
    // containers, so that they may be extended and shared
    // throughout the application
    Server      = this.Server      = {}; // DNode remote connection
    Store       = this.Store       = {}; // Subscribed model storage
    Helpers     = this.Helpers     = {}; // Format / UI helpers
    Protocols   = this.Protocols   = {}; // DNode function protocols
    Models      = this.Models      = {}; // Backbone models
    Views       = this.Views       = {}; // Backbone views
    Controllers = this.Controllers = {}; // Backbone controllers
})()