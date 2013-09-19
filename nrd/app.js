
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var bcrypt = require('bcrypt');
var Consolidate = require('consolidate');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var Model = require('./model');
var hbs = require('hbs');
var fs = require('fs');

var model = new Model();

var app = express();

// all environments


app.set('port', process.env.PORT || 3000);
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

function registerContent(content) {
  var contentDir = __dirname + '/views/partials/' + content + '.html';
  var content = fs.readFileSync(contentDir, 'utf8');
  hbs.registerPartial('content', content);
}

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
	          return done(null, {id: res.id.toString(), username: res.kerberos, firstName: res.firstName, lastName: res.lastName});
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

app.get('/', 
	passport.authenticate('local', { successRedirect: '/base.html',
                                              failureRedirect: '/login' }));
app.post('/login',
  passport.authenticate('local', { failureRedirect: '/login' }),
  function(req, res) {
    // If this function gets called, authentication was successful.
    // `req.user` contains the authenticated user.
    console.log('login success: ' + req.user.username);
    registerContent('home');
    res.render('base.html', {user: req.user});
  }
);

app.get('/login', function(req, res) {
  if (req.user !== undefined) {
  	res.redirect('/manage');
  } else {
  	res.render('login.html');
  }
});

app.get('/logout', function(req, res) {
  req.session.regenerate(function() {

    req.logout();
  res.redirect('/');
  });
});

app.get('/home', function(req, res) {
	registerContent('home');
	res.render('base.html', {user: req.user});
});

app.get('/manage', function(req, res) {
  if (req.user !== undefined) {
    console.log(req.user);
    model.getGuests(req.user.id, function(error, result) {
      guests =[]
      for (var i = 1; i <= 3; i++) {
        info = {name: result['guest' + i + 'Name'],
                kerberos: result['guest' + i + 'Kerberos']};
        guests.push(info);
      }
      registerContent('manage');
      res.render('base.html', {user: req.user, guests: guests});
    });
  } else {
  	res.redirect('/login');
  }
});

app.post('/manage', function(req, res) {
  console.log(req.user);
  if (req.user !== undefined) {
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
        res.render('base.html', {user: req.user, guests: guests});
      });
    });
  } else {
  	res.redirect('/login');
  }
});

app.post('/signup', function(req, res) {
  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(req.body.password, salt, function(err, hash) {
      model.createUser(req.body.firstName,
                          req.body.lastName,
                          req.body.kerberos,
                          hash);
      res.render('base.html');
    });
  });
});

app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
