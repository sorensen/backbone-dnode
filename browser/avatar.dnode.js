//    Aebleskiver
//    (c) 2011 Beau Sorensen
//    Aebleskiver may be freely distributed under the MIT license.
//    For all details and documentation:
//    https://github.com/sorensen/aebleskiver

(function() {
    // Avatar middleware
    // -----------------
    
    // The top-level namespace. All public classes and modules will
    // be attached to this. Exported for both CommonJS and the browser.
    var Gravatar;
    if (typeof exports !== 'undefined') {
        Gravatar = exports;
    }
    
    // Add to the main namespace with the Gravatar middleware
    // for DNode, accepts a socket client and connection
    Avatar = function(client, con) {

    	//###gravatared
        // Fetched gravatar from the server, left as a 
        // placeholder for RPC delegations in case more work
        // needs to be done on the client before updating
        this.gravatared = function(resp, options) {
            if (!resp) return;
            options.finished && options.finished(resp);
        };
    };
    
    // CommonJS browser export
    if (typeof exports === 'undefined') {
        this.Gravatar = Gravatar;
    }
})()