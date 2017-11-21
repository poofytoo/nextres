/*
 * Utility functions for app.js and other models.
 */

var LocalStrategy = require('passport-local').Strategy;
var logger = require('./logger');
var Users = require('./user').Users;
var pm = require('./permissions').Permissions;
var start_settings = require('./config').config_data['start_settings'];

module.exports.adminBypass = function(req, res, next) {
    if (req.body.authToken && req.body.authToken === start_settings.bypassToken) {
        Users.findByKerberos(start_settings.bypassUser, function(err, user) {
            if (err) {
                res.redirect('/login');
            } else {
                req.user = user;
                next();
            }
        });
    } else {
        next();
    }
};

var no_auth_routes = ['/login', '/logout', "/reset", "/forgot"];
module.exports.router = function(req, res, next) {
    if (/simple\.mit\.edu/.test(req.headers.host) || req.query.serve_simple) {
        req.serve_simple = true;
        return next();
    }
    if (req.user) {
        logger.info(req.user.kerberos + " " + req.url);
        req.permissions = pm.getPermissions(req.user.group);
        next();
    } else {
        logger.info("[Unknown user] " + req.url);
        var matched = false;
        no_auth_routes.forEach(function(route) {
            if ((req.url.indexOf(route)) > -1) {
                matched = true;
            }
        });
        if (matched) {
            next();
        } else {
            if (req.session) {
                req.session.returnTo = req.url;
            }
            res.redirect('/login');
        }
    }
};

module.exports.strategy = new LocalStrategy(
    function(username, password, done) {
        Users.findByKerberos(username, function(err, user) {
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

module.exports.deserializeUser = Users.findById;

/*
 * Returns a router that enforces a specific permission
 */
module.exports.enforce = function(permission) {
    return function(req, res, next) {
        if (req.permissions[permission]) {
            next();
        } else {
            res.status(401).send('401 Not Authorized');
        }
    };
};