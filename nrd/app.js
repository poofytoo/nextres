
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var Consolidate = require('consolidate');
var passport = require('passport');
var reservations = require('./models/reservations');
var hbs = require('hbs');
var fs = require('fs');
var nodemailer = require('nodemailer');
var initialize = require('./models/initialize');
var start_settings = require('./models/config').config_data['start_settings'];

/**
 * Routes
 */
var routes = require('./routes');
var user = require('./routes/user');
var guestlist = require('./routes/guestlist');
var funding = require('./routes/funding');
var minutes = require('./routes/minutes');
var util = require('./routes/util');
var site = require('./routes/site');
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
app.use(express.session({ secret: 'SECRET' }));
app.use(passport.initialize());
app.use(passport.session());

app.use(initialize.router);
app.use(app.router);

passport.use(initialize.strategy);

passport.serializeUser(initialize.serializeUser);
passport.deserializeUser(initialize.deserializeUser);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

/*
 * Main site
 */
app.get('/', 
	passport.authenticate('local', { successRedirect: '/base.html',
                                   failureRedirect: '/login' }),
  site.index);
app.get('/home', site.home);

/*
 * User functions
 */
app.get('/loginfail', user.loginfail);
app.post('/login',
  passport.authenticate('local', {
  	failureRedirect: '/loginfail'
  }), user.loginsuccess
);

app.post('/pwreset', user.passwordreset);
app.get('/login', user.login);
app.get('/logout', user.logout);
app.post('/remove', user.remove);
app.post('/changepermission', user.changepermission);
app.get('/allusers', user.list);
app.get('/users', user.listall);
app.get('/residentinfo', user.viewinfo);
app.post('/residentinfo', user.editinfo);
app.get('/changepassword', user.viewpassword);
app.post('/changepassword', user.editpassword);
app.post('/allusers', user.editall);
app.get('/emaillists', user.emaillists);
// TODO: client sends individual POST request for each person, and as each response is returned the page updates live


/*
 * Guestlist functions
 */
app.get('/manage', guestlist.view);
app.post('/manage', guestlist.edit);
app.get('/allguests', guestlist.list);
app.get('/searchguestlist', guestlist.search);


/*
 * Funding functions
 */
app.get('/application', funding.application);
app.post('/application', funding.submit);
app.get('/reviewapps', funding.view);
app.post('/reviewapps', funding.edit);

/*
 * House/Exec functions
 */
app.get('/minutes', minutes.viewminutes);
app.post('/minutes', minutes.editminutes);
app.delete('/minutes', minutes.removeminutes);

/*
 * Room Reservation functions
 */
app.get('/roomreservations', reservations.view);
app.post('/roomreservations', reservations.edit);
app.delete('/roomreservations', reservations.delete);
app.post('/roomreservationconfirm', reservations.confirm);
app.post('/roomreservationdeny', reservations.deny);
app.get('/managereservations', reservations.manage);

/*
 * Item Checkout functions
 */
app.get('/checkout', checkout.view);
app.post('/checkoutgetid', checkout.getusername);
app.post('/checkoutgetkerberos', checkout.getkerberos);
app.post('/checkoutsavekerberos', checkout.savekerberos);
app.post('/checkoutitem', checkout.checkoutitem);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
