(function(ß) {
    // Gravatar dnode sync
    // -------------------
    
    ß.Protocols.Gravatar = function() {
    
        // Fetched gravatar
        this.gravatared = function(resp, options) {
            if (!resp) return;
            options.finished && options.finished(resp);
        };
    };
})(ß)