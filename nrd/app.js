
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var bcrypt = require('bcrypt');
var Consolidate = require('consolidate');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var Model = require('./models/model');
var reservations = require('./models/reservations');
var hbs = require('hbs');
var fs = require('fs');
var nodemailer = require('nodemailer');

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

/**
 * Models
 */
var User = require('./models/user');
var userModel = new User();

var app = express();

// all environments

app.set('port', /*process.env.PORT || 3000*/ 8080);
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
app.use(app.router);

passport.use(new LocalStrategy(
  function(username, password, done) {
    userModel.login(username, function(error, res) {
      if (error !== null) { 
      	return done(null, false); 
      }
      if (res !== undefined) {
	      bcrypt.compare(password, res.password, function(err, authenticated) {
	        if (!authenticated) {
	          return done(null, false);
	        } else {
	          return done(null, {id: res.id.toString(),
                             username: res.kerberos,
                             firstName: res.firstName,
                             lastName: res.lastName});
	        }
	      });
      } else {
      	return done(null, false);
      }
    });
  })
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  userModel.findUser(id, function(error, user) {
    return done(null, user);
  });
});

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
app.post('/roomreservationdeny', reservations.deny);
app.get('/managereservations', reservations.manage);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
