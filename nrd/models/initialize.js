var bcrypt = require('bcrypt');
var LocalStrategy = require('passport-local').Strategy;
var logger = require('./logger')
var Model = require('./model');
var model = new Model();
var User = require('./user');
var userModel = new User();


// Do things that are common to every HTTP request
// e.g. log the request, store the permissions
module.exports.router = function(req, res, next) {
  if (req.user) {
    logger.info(req.user.kerberos + " " + req.url);
    model.getPermissions(req.user.id, function(permissions) {
      req.permissions = permissions;
      next();  // call app.router
    });
  } else {
    logger.info("[Unknown user] " + req.url);
    // only allow certain urls to go through
    if (req.url === '/login' || req.url === '/loginfail' || req.url === 'logout') {
      next();  // call app.router
    } else {
      req.session.returnTo = req.url;
      res.redirect('/login');
    }
  }
};


// Functions used by passport.
module.exports.strategy = new LocalStrategy(
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

module.exports.serializeUser = function(user, done) {
  done(null, user.id);
};

module.exports.deserializeUser = function(id, done) {
  userModel.findUser(id, function(error, user) {
    return done(null, user);
  });
};
