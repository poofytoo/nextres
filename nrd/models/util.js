/*
 * Utility functions for app.js and other models.
 */

var LocalStrategy = require('passport-local').Strategy;
var logger = require('./logger');
var Users = require('./user').Users;
var pm = require('./permissions').Permissions;

module.exports.router = function(req, res, next) {
  if (req.user) {
    logger.info(req.user.kerberos + " " + req.url);
    next();
  } else {
    logger.info("[Unknown user] " + req.url);
    if (req.url === '/login' || req.url === '/logout') {
      next()
    } else {
      req.session.returnTo = req.url;
      res.redirect('/login');
    }
  }
};

module.exports.strategy = new LocalStrategy(
    function(username, password, done) {
      Users.getUserWithKerberos(username, function(err, user) {
        if (err) {
          done(false, false);
        } else {
          user.authenticate(password, function(err, authenticated) {
            if (err || !authenticated) {
              done(false, false);
            } else {
              done(false, user);
            }
          });
        }
      });
    });

module.exports.serializeUser = function(user, done) {
  done(null, user.id);
};

module.exports.deserializeUser = Users.getUser;

/*
 * Returns a router that enforces a specific permission
 */
module.exports.enforce = function(permission) {
  return function(req, res, next) {
    if (pm.getPermissions(req.user.group)[permission]) {
      next();
    } else {
      res.type('txt').send('401 Not Authorized');
    }
  };
}
