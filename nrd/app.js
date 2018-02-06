/**
 * Module dependencies.
 */
var express = require('express');
var flash = require('connect-flash');
var https = require('https');
var http = require('http');
var path = require('path');
var url = require('url');
var fs = require('fs');
var passport = require('passport');
var hbs = require('hbs');
var schedule = require('node-schedule');
var db = require('./models/db').Database;
var Checkout = require('./models/checkout').Checkout;
var Mailer = require('./models/mailer').Mailer;
var start_settings = require('./models/config').config_data['start_settings'];
var util = require('./models/util');
var enforce = util.enforce;

/**
 * Routes
 */
var user = require('./routes/user');
var emaillist = require('./routes/emaillist');
var guestlist = require('./routes/guestlist');
var minutes = require('./routes/minutes');
var reservations = require('./routes/reservations');
var checkout = require('./routes/checkout');

var app = express();

var ssl_options = {};
if (!!start_settings['ssl']) {
    // SSL
    var private_key = fs.readFileSync(path.resolve('ssl/key.pem'), 'utf8');
    var certificate = fs.readFileSync(path.resolve('ssl/cert.pem'), 'utf8');
    var intermediate_cert = fs.readFileSync(path.resolve('ssl/intermediate_cert.pem'), 'utf8');
    var chained_cert = certificate + "\n" + intermediate_cert;
    ssl_options = {
        key: private_key,
        cert: chained_cert,
        secureProtocol: 'TLSv1_2_method',
        ciphers: [
            'ECDHE-RSA-AES128-GCM-SHA256',
            'ECDHE-ECDSA-AES128-GCM-SHA256',
            'ECDHE-RSA-AES256-GCM-SHA384',
            'ECDHE-ECDSA-AES256-GCM-SHA384',
            'DHE-RSA-AES128-GCM-SHA256',
            'ECDHE-RSA-AES128-SHA256',
            'DHE-RSA-AES128-SHA256',
            'ECDHE-RSA-AES256-SHA384',
            'DHE-RSA-AES256-SHA384',
            'ECDHE-RSA-AES256-SHA256',
            'DHE-RSA-AES256-SHA256',
            'HIGH',
            '!aNULL',
            '!eNULL',
            '!EXPORT',
            '!DES',
            '!RC4',
            '!MD5',
            '!PSK',
            '!SRP',
            '!CAMELLIA'
        ].join(':'),
        honorCipherOrder: true
    };
}

// all environments

app.set('port', start_settings['port']);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.engine('html', require('hbs').__express);
app.set('view options', { layout: false });

hbs.registerPartials(__dirname + '/views/partials');

app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
app.use(express.cookieParser());
app.use(express.logger('dev'));

app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.session({ secret: 'SECRET', store: db.store(express) }));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use(util.adminBypass);
app.use(util.router);
app.use(app.router);

passport.use(util.strategy);
passport.serializeUser(util.serializeUser);
passport.deserializeUser(util.deserializeUser);

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

/*
 * Main site
 */
app.get("*", function(req, res, next) {
    if (req.serve_simple) {
        var pathname = url.parse(req.url.replace("/emails", "/")).pathname;
        var filepath = path.resolve("../../simple-mit/www") + pathname;
        if (fs.existsSync(filepath)) {
            if (fs.lstatSync(filepath).isDirectory() && !fs.existsSync(filepath + "/index.html")) {
                console.log(filepath + " not found");
                return res.redirect("/");
            }
            return res.sendfile(filepath);
        }
        console.log(filepath + " not found");
        return res.redirect("/");
    }
    next();
});

app.get('/', user.viewprofile);
app.get('/home', user.viewprofile);

/*
 * Password reset
 */
app.get('/auth/forgot', function(req, res) {
    res.render('reset-password');
});
app.post('/auth/forgot', user.forgotPassword);
app.get('/auth/reset/:token', user.validateResetToken);
app.post('/auth/reset/:token', user.resetPassword);
/*
 * User functions
 */
app.get('/login', user.login);
app.post('/login',
    passport.authenticate('local', { failureRedirect: '/login', failureFlash: 'Invalid login' }),
    user.loginsuccess
);
app.post('/loginas', enforce('FULL_PERMISSIONS_CONTROL'), user.loginas);
app.get('/logout', user.logout);
app.get('/users', user.list);
app.post('/users', enforce('CREATE_USER'), user.massadd);
app.post('/removeuser', enforce('CREATE_USER'), user.remove);
app.get('/residentinfo', user.viewprofile);
app.post('/residentinfo', user.editprofile);
app.get('/password', user.viewpassword);
app.post('/password', user.editpassword);
app.post('/resetpassword', enforce('CREATE_USER'), user.resetpassword);
app.post('/changepermission', enforce('MAKE_USERS_DESKWORKERS'), user.changepermission);
app.post('/findmitid', enforce('CHECKOUT_ITEMS'), user.findmitid);
app.post('/searchkerberos', enforce('CHECKOUT_ITEMS'), user.searchkerberos);
app.post('/savekerberos', enforce('CHECKOUT_ITEMS'), user.savekerberos);
app.post('/updateroomnumbers', enforce('CREATE_USER'), user.updateRoomNumbers);
app.get('/searchusers', enforce('VIEW_GUEST_LISTS'), user.search);


/*
 * Email lists
 */
app.get('/emaillists', emaillist.view);


/*
 * Guestlist functions
 */
app.get('/allguests', enforce('VIEW_GUEST_LISTS'), guestlist.list);
app.get('/searchguests', enforce('VIEW_GUEST_LISTS'), guestlist.search);
app.get('/guestlist', guestlist.view);
app.post('/guestlist', guestlist.edit);
app.get('/manageguestlists', enforce('EDIT_GUEST_LISTS'), guestlist.manage);
app.post('/manageguestlists', enforce('EDIT_GUEST_LISTS'), guestlist.editother);


/*
 * House/Exec functions
 */
app.get('/minutes', minutes.list);
app.get('/minutes/:minute', minutes.view);
app.post('/minutes', enforce('EDIT_MINUTES'), minutes.edit);
app.delete('/minutes', enforce('EDIT_MINUTES'), minutes.remove);


/*
 * Room Reservation functions
 */
app.get('/roomreservations', reservations.list);
app.post('/roomreservations', reservations.add);
app.get('/roomreservations/:id', reservations.view);
app.post('/roomreservations/:id', reservations.edit);
app.delete('/roomreservations', reservations.remove);
app.post('/roomreservationconfirm', enforce('EDIT_RESERVATIONS'), reservations.confirm);
app.post('/roomreservationdeny', enforce('EDIT_RESERVATIONS'), reservations.deny);
app.get('/managereservations', enforce('EDIT_RESERVATIONS'), reservations.manage);


/*
 * Item Checkout functions
 */
app.get('/viewitems', checkout.viewonly);
app.get('/checkout', enforce('CHECKOUT_ITEMS'), checkout.list);
app.get('/additempage', enforce('CHECKOUT_ITEMS'), checkout.additempage);
app.post('/additem', enforce('CHECKOUT_ITEMS'), checkout.add);
app.post('/removeitem', enforce('CHECKOUT_ITEMS'), checkout.remove);
app.post('/getrecentlyaddeditems', enforce('CHECKOUT_ITEMS'), checkout.listrecent);
app.post('/checkoutitemstatus', enforce('CHECKOUT_ITEMS'), checkout.get);
app.post('/checkinitem', enforce('CHECKOUT_ITEMS'), checkout.checkin);
app.post('/checkoutitem', enforce('CHECKOUT_ITEMS'), checkout.checkout);
app.post('/usercheckoutdata', enforce('CHECKOUT_ITEMS'), checkout.getusercheckoutdata);

var httpServer = http.createServer(!!start_settings['ssl'] ? function(req, res) {
    if (!/localhost|file/.test(req.headers.host)) {
        res.writeHead(301, { "Location": "https://" + req.headers.host + req.url });
        res.end();
    }
} : app).listen(app.get('port'), function() {
    console.log("HTTP server listening on port " + app.get('port'))
});

if (!!start_settings['ssl']) {
    https.createServer(ssl_options, app).listen(443, function() {
        console.log("HTTPS server listening on port 443");
    });
}

schedule.scheduleJob({ hour: 0, minute: 0, second: 0 }, function() {
    Checkout.getOverdueItems(function(err, overdueItems) {
        for (var user in overdueItems) {
            var email = user + '@mit.edu';
            Mailer.informOverdue(email, overdueItems[user]);
        }
    });
});