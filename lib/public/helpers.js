(function(Helpers) {
    // Helpers
    // -------
    
    // Format a timestamp from miliseconds to a 
    // human readable string
    Helpers.timeFormat = function(miliseconds) {
        if (!miliseconds) return false;
    
        var now    = new Date(miliseconds);
        var hour   = now.getHours();
        var minute = now.getMinutes();

        if (hour   < 10) { hour   = '0' + hour;   }
        if (minute < 10) { minute = '0' + minute; }

        var timeString = '[' + hour + ':' + minute + ']';
        return timeString;
    };
    
    // Helper function to get a URL from a Model or Collection as a property
    // or as a function.
    Helpers.getUrl = function(object) {
        if (!(object && object.url)) return null;
        return _.isFunction(object.url) ? object.url() : object.url;
    };
    
})(Helpers)