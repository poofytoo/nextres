
/**
 * Module dependencies.
 */
var express = require('express');
var flash = require('connect-flash');
var http = require('http');
var path = require('path');
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

// all environments

app.set('port', start_settings['port']);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.engine('html', require('hbs').__express);
app.set('view options', {layout: false});

hbs.registerPartials(__dirname + '/views/partials');

app.use(express.favicon(__dirname + '/public/images/favicon.ico')); 
app.use(express.cookieParser());
app.use(express.logger('dev'));

app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.session({secret: 'SECRET', store: db.store(express)}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

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
app.get('/', user.viewprofile);
app.get('/home', user.viewprofile);

/*
 * User functions
 */
app.get('/login', user.login);
app.post('/login',
    passport.authenticate('local',
      {failureRedirect: '/login', failureFlash: 'Invalid login'}),
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

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var rule = new schedule.RecurrenceRule();
schedule.scheduleJob({hour: 0, minute: 0, second:0}, function() {
  Checkout.getOverdueItems(function(err, overdueItems) {
    for (var user in overdueItems) {
      var email = user + '@mit.edu';
      Mailer.informOverdue(email, overdueItems[user]);
    }
  });
});
