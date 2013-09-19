
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
app.engine('html', Consolidate.handlebars);
app.set('view engine', 'html');

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
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findOne(id, function(err, user) {
    done(err, user.kerberos);
  });
});
// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res){
  res.render('index.html');
});

app.post('/login',
  passport.authenticate('local'),
  function(req, res) {
    // If this function gets called, authentication was successful.
    // `req.user` contains the authenticated user.
    console.log('login success: ' + req.user.username);
    res.render('index.html');
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
