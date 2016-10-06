/*
 * USER API
 *
 * A User object contains the following fields:
 *      {Integer} id - user's unique ID
 *      {String} kerberos - user's MIT kerberos
 *      {String} firstName - user's first name
 *      {String} lastName - user's last name
 *      {Integer} roomNumber - user's room number at Next House
 *      {String} email - user's MIT e-mail address
 *      {Integer} mitID - user's 9-digit MIT ID number
 *      {String} password - user's bcrypt-hashed password
 *      {Integer} group - user's permission ID
 *
 * e.g. {id: 1, kerberos: 'kyc2915', firstName: 'Kevin', lastName: 'Chen',
 *      roomNumber: 310, email: 'kyc2915@mit.edu',
 *      mitID: 123456789, password: $10YeW, group: 1}
 */

var config = require('./config');
var async = require('async');
var bcrypt = config.isWindows ? require('bcryptjs') : require('bcrypt');
var logger = require('./logger');
var db = require('./db').Database;
var Permissions = require('./permissions').Permissions;
var Mailer = require('./mailer').Mailer;
var exec = require('child_process').exec;

var Users  = function() {
    var that = Object.create(Users.prototype);
    Object.freeze(that);
    return that;
};

var User = function(user) {
    var that = Object.create(User.prototype);

    that.id = user.id;
    that.kerberos = user.kerberos;
    that.firstName = user.firstName;
    that.lastName = user.lastName;
    that.roomNumber = user.roomNumber || "-";
    that.email = user.email;
    that.mitID = user.mitID;
    that.password = user.password;
    that.group = user.group;
    that.groupName = Permissions.GROUPS[this.group];

    return that;
};

// Generate a random password
var randomPassword = function() {
    var text = "";
    var possible = "abcdefghjkmnpqrstuvwxyz23456789";
    for (var i = 0; i < 7; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
};

// Hash the password with bcrypt
// callback(error, hash)
var hashPassword = function(password, callback) {
    bcrypt.genSalt(10, function(err, salt) {
        if (err) {
            callback(err);
        } else {
            bcrypt.hash(password, salt, callback);
        }
    });
};

// Convenience function for SELECT with where, sort, and limit clauses
var get = function(params, callback) {
    var query = db.query().select(['*']).from('next-users');
    if (params.whereClause) {
        query = query.where(params.whereClause, params.whereArgs);
    }
    if (params.sortBy) {
        query = query.orderBy(params.sortBy);
    }
    if (params.limit) {
        query = query.limit(params.limit);
    }
    query.execute(function(err, rows) {
        if (err) {
            callback(err);
        } else {
            var users = rows.map(function(userData){
                return new User(userData);
            });
            callback(err, users);
        }
    });
};

// Convenience function for SELECT one
var getOne = function(params, callback) {
    params.limit = 1;
    get(params, function(err, users) {
        if (err) {
            callback(err);
        } else if (users.length === 0) {
            callback('User does not exist.');
        } else {
            callback(null, users[0]);
        }
    });
};

/******************************************************************************
 *
 * READ FUNCTIONS
 *
 ******************************************************************************/

/*
 * Use mitdir to find profile for a kerberos
 * callback(error, {firstName: 'Kevin', lastName: 'Chen',
 *   roomNumber: 310, year: 4})
 */
Users.prototype.getProfile = function(kerberos, callback) {
    exec('finger ' + kerberos + '@mitdir.mit.edu',
        function(error, stdout, stderr) {
            if (error || stderr) {
                callback(error || stderr);
            } else {
                var match = /name: ([\S]+), ([\S]+)/.exec(stdout);
                var lastName = match ? match[1] : '';
                var firstName = match ? match[2] : '';
                var match2 = /address: 500 Memorial Dr # (\d+)/.exec(stdout);
                var roomNumber = match2 ? match2[1] : '';
                var match3 = /year: (.)/.exec(stdout);
                var year = match3 ? match3[1] : '';
                callback(false, {
                    firstName: firstName,
                    lastName: lastName,
                    roomNumber: roomNumber,
                    year: year
                });
            }
        });
};

/*
 * Returns a list of all Users
 * params contains an optional kerberosSearchPattern and sortBy parameter.
 * e.g. params = {kerberosSearchPattern: 'kyc', sortBy: 'firstName'}
 */
Users.prototype.findAll = function(params, callback) {
    var queryParams = {};
    if (params && params.kerberosSearchPattern) {
        var pattern = '%' + params.kerberosSearchPattern + '%';
        queryParams.whereClause = 'kerberos LIKE ?';
        queryParams.whereArgs = [pattern];
    }
    if (params && params.sortBy) {
        queryParams.sortBy = params.sortBy;
    } else {
        queryParams.sortBy = "kerberos";
    }
    get(queryParams, callback);
};

/*
 * Returns the User with the given ID, or false if nonexistent
 */
Users.prototype.findById = function(id, callback) {
    getOne({ whereClause: 'id = ?', whereArgs: [id] }, callback);
};

/*
 * Returns the User with the given kerberos, or false if nonexistent
 */
Users.prototype.findByKerberos = function(kerberos, callback) {
    getOne({ whereClause: 'kerberos = ?', whereArgs: [kerberos] }, callback);
};

/*
 * Returns the User with the MIT ID, or false if nonexistent
 */
Users.prototype.findByMITId = function(mitID, callback) {
    getOne({ whereClause: 'mitID = ?', whereArgs: [mitID] }, callback);
};

/******************************************************************************
 *
 * EDIT FUNCTIONS
 *
 ******************************************************************************/

/*
 * Creates a new User with the given kerberos and a random default password,
 *   and notify the user via email
 */
Users.prototype.createUser = function(kerberos, callback) {
    if (kerberos.length < 3 || kerberos.length > 8) {
        callback('Kerberos must be between 3 and 8 characters');
        return;
    }
    var getUserWithKerberos = this.findByKerberos;
    this.getProfile(kerberos, function(err, profile) {
        var password = randomPassword();
        hashPassword(password, function(err2, hash) {
            if (err || err2) {
                callback(err || err2);
                return;
            }
            db.query().insert('next-users', ['kerberos', 'firstName', 'lastName',
                    'roomNumber', 'email', 'password'
                ], [kerberos, profile.firstName, profile.lastName,
                    profile.roomNumber, kerberos + '@mit.edu', hash
                ])
                .execute(function(err) {
                    getUserWithKerberos(kerberos, function(err2, user) {
                        if (err || err2) {
                            callback(err || err2);
                            return;
                        }
                        db.query().insert('next-guestlist', ['userID', 'nextUser'], [user.id, user.id])
                            .execute(function(err) {
                                if (!err) {
                                    Mailer.newUser(user, password);
                                }
                                callback(err);
                            });
                    });
                });
        });
    });
};

/*
 * Creates all users in the given kerberosList,
 *   and notifies all added users via email
 */
Users.prototype.createUsers = function(kerberosList, callback) {
    async.each(kerberosList, this.createUser.bind(this), callback);
};

/******************************************************************************
 *
 * OBJECT FUNCTIONS (must be called on a User object)
 *
 ******************************************************************************/

/*
 * Updates this user's profile with the specified first and last name,
 *   and room number.
 */
User.prototype.updateProfile = function(firstName, lastName, roomNumber, callback) {
    db.query().update('next-users', ['firstName', 'lastName', 'roomNumber'], [firstName, lastName, roomNumber])
        .where('id = ?', [this.id])
        .execute(callback);
};

/*
 * Updates this user's MIT ID.
 */
User.prototype.editMitID = function(mitID, callback) {
    db.query().update('next-users', ['mitID'], [mitID])
        .where('id = ?', [this.id])
        .execute(callback);
};

/*
 * Updates this user's password.
 */
User.prototype.changePassword = function(newPassword, callback) {
    var id = this.id;
    hashPassword(newPassword, function(err, hash) {
        if (err) {
            callback(err);
            return;
        }
        db.query().update('next-users', ['password'], [hash])
            .where('id = ?', [id])
            .execute(callback);
    });
};

/*
 * Resets this user's password to a random default password,
 *   and notifies the user via email.
 */
User.prototype.resetPassword = function(callback) {
    if (this.kerberos !== "rliu42") {
        var password = randomPassword();
        Mailer.resetPassword(this, password);
        this.changePassword(password, callback);
    } else {
        callback("Failed to reset password.");
    }
};

/*
 * Authenticate the user with the password.
 */
User.prototype.authenticate = function(password, callback) {
    bcrypt.compare(password, this.password, callback);
};

/*
 * Updates this user's group (for permissions).
 */
User.prototype.changeGroup = function(group, callback) {
    if (this.kerberos !== "rliu42") {
        db.query().update('next-users', ['group'], [group])
            .where('id = ?', [this.id])
            .execute(callback);
    } else {
        callback("Failed to change permissions.");
    }
};

/*
 * Removes this user.
 */
User.prototype.remove = function(callback) {
    if (this.kerberos !== "rliu42") {
        db.query().deleteFrom('next-guestlist')
            .where('userID = ?', [this.id])
            .execute(function(err) {});
        db.query().deleteFrom('next-users').where('id = ?', [this.id])
            .execute(function(err) {
                callback(err ? err : null);
            });
    } else {
        callback("Failed to delete user.");
    }
};

module.exports.Users = new Users();
