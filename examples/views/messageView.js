(function(Views) {
    // Message view
    // -----------------
    
    // Single room message
    Views.MessageView = Backbone.View.extend({
        
        // DOM attributes
        tagName   : 'li',
        className : 'message',
        template  : _.template($('#message-template').html()),
    
        // Constructor
        initialize : function(options) {
            _.bindAll(this, 'render');
            this.model.bind('change', this.render);
            this.model.view = this;
        },
        
        // Remove this view from the DOM.
        remove : function() {
            $(this.el).remove();
        },
    
        // Render contents
        render : function() {
            var content = this.model.toJSON();
            
            // Pre-formatting 
            content.text    = this.model.escape('text');
            content.created = Helpers.timeFormat(content.created));
            
            var view = Mustache.to_html(this.template(), content);
            $(this.el).html(view);
            
            // Post-formatting, done here as to prevent conflict
            // with Mustache HTML entity escapement
            this.$('.data')
                .html(Helpers.linkify(content.text))
                .emoticonize({
                    //delay: 800,
                    //animate: false
                    //exclude: 'pre, code, .no-emoticons'
                });
            
            return this;
        }
    });

})(Views)
