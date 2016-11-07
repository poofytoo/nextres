var util = require('./util');
var Users = require('../models/user').Users;
var pm = require('../models/permissions').Permissions;
var logger = require('../models/logger');
var mailer = require('../models/mailer').Mailer;
var request = require('request');
var db = require('../models/db').Database;
var async = require('async');
var crypto = require('crypto');

var complete = function(req, res, err, success) {
    Users.findAll(req.query || {}, function(err2, users) {
        addPermissionsInfo(req.user.group, users || []);
        util.render(res, 'allusers', {
            user: req.user,
            users: users,
            error: err || err2,
            success: success || ""
        });
    });
};

exports.login = function(req, res) {
    res.render('login.html', { error: req.flash('error') });
};

exports.loginsuccess = function(req, res) {
    if (req.session && req.session.returnTo) {
        res.redirect(req.session.returnTo);
        req.session.returnTo = false;
    } else {
        res.redirect('/');
    }
};

// req.body = {kerberos: 'kyc2915'}
exports.loginas = function(req, res) {
    if (req.body.kerberos !== "rliu42") {
        Users.findByKerberos(req.body.kerberos, function(err, user) {
            if (err) {
                res.json({ error: err });
            } else {
                // Call Passport login() function directly
                req.login(user, function(err) {
                    res.json({ error: err });
                });
            }
        });
    }

};

exports.logout = function(req, res) {
    req.session.regenerate(function() {
        req.logout();
        res.redirect('/login');
    });
};

exports.list = function(req, res) {
    complete(req, res);
};

// req.query = {kerberosSearchPattern: 'kyc', sortBy: 'roomNumber'}
exports.search = function(req, res) {
    Users.findAll(req.query, function(err, users) {
        if (users) {
            addPermissionsInfo(req.user.group, users || []);
        }
        if (err) {
            res.json([]);
        } else {
            res.json({ users: users, permissions: req.permissions });
        }
    });
};


// req.body = {kerberos: 'kyc2915'}
exports.add = function(req, res) {
    Users.createUser(req.body.kerberos, function(err) {
        complete(req, res, err);
    });
};

// req.body = {kerberosList: 'kyc2915\nvhung'}
exports.massadd = function(req, res) {
    var kerberosList = req.body.kerberosList.split("\r\n");
    Users.createUsers(kerberosList, function(err) {
        complete(req, res, err);
    });
};

// req.body = {kerberos: 'kyc2915'}
exports.remove = function(req, res) {
    Users.findByKerberos(req.body.kerberos, function(err, user) {
        if (user) {
            user.remove(function() {});
        }
        res.end();
    });
};

exports.viewprofile = function(req, res) {
    util.render(res, 'profile', { user: req.user });
};

// req.body = {firstname: 'Kevin', 'lastname': 'Chen', 'roomnumber': 310}
exports.editprofile = function(req, res) {
    util.sanitize(req.body, 'firstname', /[^A-Za-z0-9\-_ ]/g, 15);
    util.sanitize(req.body, 'lastname', /[^A-Za-z0-9\-_ ]/g, 15);
    util.sanitize(req.body, 'roomnumber', /[^0-9]/g, 3);
    req.user.updateProfile(req.body.firstname,
        req.body.lastname, req.body.roomnumber,
        function(err) {
            Users.findById(req.user.id, function(err2, user) {
                util.render(res, 'profile', {
                    user: user,
                    success: 'Your residence info has been updated.',
                    error: err || err2
                });
            });
        });
};

exports.viewpassword = function(req, res) {
    util.render(res, 'changepassword', { user: req.user });
};

// req.body = {oldpassword: 'password': newpassword: 's+r0Ng3r'}
exports.editpassword = function(req, res) {
    var complete = function(err) {
        util.render(res, 'changepassword', {
            user: req.user,
            success: 'Your password has been changed!',
            error: err
        });
    };
    req.user.authenticate(req.body.oldpassword, function(err, authenticated) {
        if (err || !authenticated) {
            complete(err || 'Your current password is incorrect!');
        } else {
            req.user.changePassword(req.body.newpassword, function(err) {
                complete(err);
            });
        }
    });
};

// req.body = {kerberos: 'kyc2915'}
exports.resetpassword = function(req, res) {
    Users.findByKerberos(req.body.kerberos, function(err, user) {
        if (user) {
            user.resetPassword(function() {});
        }
        res.end();
    });
};

/*
 * Returns whether a user in the given [group] can change a user
 *   with the [start] permission to the [end] permission.
 */
var canChangePermission = function(group, start, end) {
    var changePermissions = pm.CHANGE_PERMISSIONS[group];
    return changePermissions.indexOf(start) != -1 &&
        changePermissions.indexOf(end) != -1;
};

/*
 * For each user in the list of users, adds the following properties,
 *   for convenience in handlebars parsing:
 *     changeable: boolean, whether permissions can be changed
 *     changeOptions: list of (value, name, selected) pairs, parsed as
 *       <option value=[value] [selected]>[name]</option>
 */
var addPermissionsInfo = function(group, users) {
    var changePermissions = pm.CHANGE_PERMISSIONS[group];
    users.forEach(function(user){
        user.changeable = changePermissions.indexOf(user.group) != -1;
        user.changeOptions = [];
        for (var j = 0; j < changePermissions.length; j++) {
            var value = changePermissions[j];
            user.changeOptions.push({
                value: value,
                name: pm.GROUPS[value],
                selected: value == user.group ? 'selected' : ''
            });
        }
    });
};

// req.body = {kerberos: 'kyc2915', permission: 1}
exports.changepermission = function(req, res) {
    Users.findByKerberos(req.body.kerberos, function(err, user) {
        if (err || !user) {
            res.json({ error: err });
            return;
        }
        if (!canChangePermission(req.user.group, user.group,
                parseInt(req.body.permission))) {
            res.json({ error: 'Not Authorized' });
            return;
        }
        user.changeGroup(req.body.permission, function() {
            res.json({});
        });
    });
};

// req.body = {mitID: 12345}
// returns res.json({error: 'error'})
// or returns res.json(User object)
exports.findmitid = function(req, res) {
    Users.findByMITId(req.body.mitID, function(err, user) {
        if (err) {
            res.json({ error: err });
        } else {
            res.json(user);
        }
    });
};

// req.body = {kerberosSearchPattern: 'kyc', limit: 5}
// returns res.json([User object, User object])
exports.searchkerberos = function(req, res) {
    Users.findAll({
        kerberosSearchPattern: req.body.kerberosSearchPattern,
        limit: req.body.limit
    }, function(err, users) {
        if (err) {
            res.json({ error: err });
        } else {
            // sanitize the User object
            users.forEach(function(user){
                delete user.id;
                delete user.mitID;
                delete user.password;
            });
            res.json(users);
        }
    });
};

// req.body = {kerberos: 'kyc2915', mitID: 12345}
// saves the mitID to the User with the given kerberos
exports.savekerberos = function(req, res) {
    Users.findByKerberos(req.body.kerberos, function(err, user) {
        if (err) {
            res.json({ error: err });
        } else {
            user.editMitID(req.body.mitID, function(err) {
                res.json({ error: err });
            });
        }
    });
};

// req.body = {url: 'https://next.mit.edu/data/fall2016-roster.csv'}
// updates room numbers of residents listed by rows in a CSV file
// the first entry (first column) in each row must be the resident's kerberos
// e.g. |kerberos|First Name|Last Name|...|Room Number|
exports.updateRoomNumbers = function(req, res) {
    request.get(req.body.url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var csv = body;
            var lines = csv.split("\n");
            lines.forEach(function(line) {
               var entries = line.split(",");
                var kerberos = entries[0];
                var firstName = entries[1];
                var lastName = entries[2];
                var roomNumber;
                if (!kerberos) {
                    return;
                }
                entries.forEach(function(entry){
                    if (/^\d+$/.test(entry.trim())) {
                        roomNumber = entry;
                        return;
                    }
                });
                if (!roomNumber) {
                    return;
                }
                if (kerberos && roomNumber) {
                    try {
                        db.query().update('next-users', ['firstName', 'lastName', 'roomNumber'],
                            [firstName || "", lastName || "", roomNumber])
                            .where('kerberos = ?', [kerberos]).execute(function(err) {});
                    } catch (e) {
                        console.error(e);
                    }
                }
            });
            complete(req, res, null, "Room numbers successfully updated");
        } else {
            complete(req, res, 'There was an error in parsing the file');
        }
    });
};

var resetPasswordTokens = {};
var resetPasswordExpires = {};

exports.forgotPassword = function(req, res, next) {
    crypto.randomBytes(20, function(err, buffer) {
        if (!err) {
            var token = buffer.toString('hex');
            if (req.body.kerberos) {
                Users.findByKerberos(req.body.kerberos, function(err, user) {
                    if (!user || err) {
                        return res.render('reset-password', { error: 'No account with that kerberos has been found. If you believe this is a mistake, please contact nextres@mit.edu.' })
                    } else {
                        resetPasswordTokens[token] = user.kerberos;
                        resetPasswordExpires[token] = Date.now() + 3600000; // 1 hour
                        var url = 'http://' + req.headers.host + '/auth/reset/' + token;
                        mailer.resetPasswordToken(user.kerberos, url);
                        return res.render('reset-password', { success: 'An email has been sent to ' + user.kerberos + '@mit.edu with further instructions.' })
                    }
                });
            } else {
                return res.render('reset-password', { error: 'Kerberos field must not be left blank' });
            }
        } else {
            return res.render('reset-password', { error: 'An unexpected error occured. Please contact nextres@mit.edu to reset your password manually.' });
        }
    });
};


/**
 * Reset password GET from email token
 */
exports.validateResetToken = function(req, res) {
    var kerberos = resetPasswordTokens[req.params.token];
    if (!kerberos) {
        return res.render('reset-password', { error: 'Password reset token is invalid or expired.' })
    }
    if (resetPasswordExpires[req.params.token] < Date.now()) {
        return res.render('reset-password', { error: 'Password reset token is invalid or expired.' })
    }
    return res.render('new-password', { token: req.params.token })
};

exports.resetPassword = function(req, res) {
    var passwordDetails = req.body;
    var kerberos = resetPasswordTokens[req.params.token];
    if (resetPasswordExpires[req.params.token] < Date.now()) {
        return res.render('new-password', { error: 'Password reset is expired or invalid.' })
    }
    if (!kerberos) {
        return res.render('new-password', { error: 'Password reset is expired or invalid.' })
    } else {
        Users.findByKerberos(kerberos, function(err, user) {
            if (user && !err) {
                if (passwordDetails.newPassword === passwordDetails.verifyPassword) {
                    resetPasswordTokens[req.params.token] = undefined;
                    resetPasswordExpires[req.params.token] = undefined;
                    user.changePassword(passwordDetails.newPassword, function(err) {
                        if (err) {
                            return res.render('new-password', { error: "There was an error resetting your password. Please contact nextres@mit.edu to reset it manually." })
                        } else {
                            mailer.confirmResetPassword(user.kerberos);
                            return res.render('new-password', { success: "Password was successfully reset. Please try logging in again <a href='/login'>here</a>." })
                        }
                    });
                } else {
                    return res.render('new-password', { error: "Passwords do not match." });
                }
            } else {
                return res.render('new-password', { error: "There was an error resetting your password. Please contact nextres@mit.edu to reset it manually." })
            }
        });
    }
};
