var isAndroid = /android|blackberry/i.test(navigator.userAgent);
var isIos = /iphone|ios|ipod/i.test(navigator.userAgent);

var $$ = Dom7;

if (isAndroid) {
    // Change class
    $(document).ready(function() {
        $$('.view.navbar-through').removeClass('navbar-through').addClass('navbar-fixed');
        // And move Navbar into Page
        $$('.view .navbar').prependTo('.view .page');
    })
}

Template7.global = {
    android: isAndroid,
    ios: isIos
};

var NR = new Framework7({
    // Enable Material theme for Android device only
    material: isAndroid ? true : false,
    // Enable Template7 pages
    template7Pages: true
});

if (isAndroid || isIos) {
    $(document).ready(function() {
        $('.browser').hide();
        $('.mobile').fadeIn();
    })
} else {
    $(document).ready(function() {
        $('.browser').show();
        $('.mobile').hide();
    })
}
