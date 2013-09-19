
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

var model = new Model();

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.engine('.html', Consolidate.handlebars);
app.set('view engine', 'handlebars');
app.set('view options', {layout: false});

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
      if (error !== null) { return done(null, false); }
      bcrypt.compare(password, res.password, function(err, authenticated) {
        if (!authenticated) {
          return done(null, false);
        } else {
          return done(null, {id: res.id.toString(), username: res.kerberos, firstName: res.firstName, lastName: res.lastName});
        }
      });
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

app.get('/', function(req, res){
  res.render('index.html', {user: req.user});
});

app.post('/login',
  passport.authenticate('local'),
  function(req, res) {
    // If this function gets called, authentication was successful.
    // `req.user` contains the authenticated user.
    console.log('login success: ' + req.user.username);
    res.render('index.html', {user: req.user});
  }
);

app.get('/login', function(req, res) {
  res.render('login.html');
});

app.get('/logout', function(req, res) {
  req.session.regenerate(function() {

    req.logout();
  res.redirect('/');
  });
});

app.get('/manage', function(req, res) {
  if (req.user !== undefined) {
    console.log(req.user);
    model.getGuests(req.user.id, function(error, result) {
      guests =[]
      for (var i = 1; i <= 10; i++) {
        info = {name: result['guest' + i + 'Name'],
                kerberos: result['guest' + i + 'Kerberos']};
        guests.push(info);
      }
      res.render('manage.html', {user: req.user, guests: guests});
    });
  } else {
    res.render('manage.html');
  }
});

app.post('/manage', function(req, res) {
  console.log(req.user);
  if (req.user !== undefined) {
    guests = [];
    for (var i = 0; i < 10; i++) {
      info = {name: req.body['guest' + i + 'Name'],
              kerberos: req.body['guest' + i + 'Kerberos']};
      guests.push(info);
    }
    var id = req.user.id;
    model.addGuests(id, guests, function(error, result) {
      model.getGuests(id, function(error, result) {
        guests =[];
        for (var i = 1; i <= 10; i++) {
          info = {name: result['guest' + i + 'Name'],
                  kerberos: result['guest' + i + 'Kerberos']};
          guests.push(info);
        }
        res.render('manage.html', {user: req.user, guests: guests});
      });
    });
  }
});

app.post('/signup', function(req, res) {
  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(req.body.password, salt, function(err, hash) {
      model.createUser(req.body.firstName,
                          req.body.lastName,
                          req.body.kerberos,
                          hash);
      res.render('index.html');
    });
  });
});

app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
