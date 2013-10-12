
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
var house = require('./routes/house');
var util = require('./routes/util');
var site = require('./routes/site');

/**
 * Models
 */
var Model = require('./models/model');
var model = new Model();

var app = express();

// all environments

app.set('port', /*process.env.PORT || 3000*/ 8080);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.engine('html', require('hbs').__express);
app.set('view options', {layout: false});

hbs.registerPartials(__dirname + '/views/partials');

app.use(express.favicon());
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
    model.login(username, function(error, res) {
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
  model.findUser(id, function(error, user) {
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
app.get('/minutes', house.viewminutes);
app.post('/minutes', house.editminutes);
// TODO: make a post request
app.get('/minutesdel', house.removeminutes);

/*

    guests = [];
    for (var i = 0; i < 3; i++) {
      info = {name: req.body['guest' + i + 'Name'],
              kerberos: req.body['guest' + i + 'Kerberos']};
      guests.push(info);
    }
    var id = req.user.id;
    model.addGuests(id, guests, function(error, result) {
      model.getGuests(id, function(error, result) {
        guests =[];
        for (var i = 1; i <= 3; i++) {
          info = {name: result['guest' + i + 'Name'],
                  kerberos: result['guest' + i + 'Kerberos']};
          guests.push(info);
        }
        registerContent('manage');
        model.getPermissions(req.user.id, function(permissions) {
          res.render('base.html', {'user': req.user,
                                   'permissions': permissions,
                                   'guests': guests});
        });
      });
    });
    */


// TODO: remove individual signup
/*
app.post('/signup', function(req, res) {
  var errorLog = "";
  bcrypt.genSalt(10, function(err, salt) {
  	pw = randomPassword();
    bcrypt.hash(pw, salt, function(err, hash) {
      model.createUser(req.body.kerberos,
                          hash, pw, function(error, result) {
                          	errorLog += error;
                          });
      model.getPermissions(req.user.id, function(permissions) {
      
        registerContent('allusers');
        res.render('base.html', {'user': req.user, 'permissions': permissions, 'error' : errorLog});
      });
    });
  });
});
*/

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
