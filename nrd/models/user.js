/*
 * USER API
 *
 * A User object contains the following fields:
 *      id: unique int id
 *      kerberos: string
 *      firstName: string
 *      lastName: string
 *      roomNumber: int
 *      email: email string
 *      mitID: 9 digit longint
 *      password: string (bcrypt hash)
 *      group: int (for permissions)
 *
 * e.g. {id: 1, kerberos: 'kyc2915', firstName: 'Kevin', lastName: 'Chen',
 *      roomNumber: 310, email: 'kyc2915@mit.edu',
 *      mitID: 123456789, password: $10YeW, group: 1}
 */

var async = require('async');
var bcrypt = require('bcrypt');
var logger = require('./logger');
var db = require('./db').Database;
var Permissions = require('./permissions').Permissions;
var Mailer = require('./mailer').Mailer;
var exec = require('child_process').exec;

function Users() {
}

function User(user) {
  this.id = user.id;
  this.kerberos = user.kerberos;
  this.firstName = user.firstName;
  this.lastName = user.lastName;
  this.roomNumber = user.roomNumber;
  this.email = user.email;
  this.mitID = user.mitID;
  this.password = user.password;
  this.group = user.group;
  this.groupName = Permissions.GROUPS[this.group];
}

// Generate a random password
function randomPassword() {
  var text = "";
  var possible = "abcdefghjkmnpqrstuvwxyz23456789";
  for (var i = 0; i < 7; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

// Hash the password with bcrypt
// callback(error, hash)
function hashPassword(password, callback) {
  bcrypt.genSalt(10, function(err, salt) {
    if (err) {
      callback(err);
    } else {
      bcrypt.hash(password, salt, callback);
    }
  });
}

// Convenience function for SELECT with where, sort, and limit clauses
function get(params, callback) {
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
      for (var i = 0; i < rows.length; i++) {
        rows[i] = new User(rows[i]);
      }
      callback(err, rows);
    }
  });
}

// Convenience function for SELECT one
function getOne(params, callback) {
  params.limit = 1;
  get(params, function(err, users) {
    if (err) {
      callback(err);
    } else if (users.length === 0) {
      callback('No user found.');
    } else {
      callback(false, users[0]);
    }
  });
}

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
}

/*
 * Returns a list of all Users
 * params contains an optional kerberosSearchPattern and sortBy parameter.
 * e.g. params = {kerberosSearchPattern: 'kyc', sortBy: 'firstName'}
 */
Users.prototype.getAllUsers = function(params, callback) {
  var queryParams = {};
  if (params && params.kerberosSearchPattern) {
    var pattern = '%' + params.kerberosSearchPattern + '%';
    queryParams.whereClause = 'kerberos LIKE ?';
    queryParams.whereArgs = [pattern];
  }
  if (params && params.sortBy) {
    queryParams.sortBy = params.sortBy;
  }
  get(queryParams, callback);
}

/*
 * Returns the User with the given ID, or false if nonexistent
 */
Users.prototype.getUser = function(id, callback) {
  getOne({whereClause: 'id = ?', whereArgs: [id]}, callback);
}

/*
 * Returns the User with the given kerberos, or false if nonexistent
 */
Users.prototype.getUserWithKerberos = function(kerberos, callback) {
  getOne({whereClause: 'kerberos = ?', whereArgs: [kerberos]}, callback);
}

/*
 * Returns the User with the MIT ID, or false if nonexistent
 */
Users.prototype.getUserWithMitID = function(mitID, callback) {
  getOne({whereClause: 'mitID = ?', whereArgs: [mitID]}, callback);
}

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
  if (kerberos.length > 8) {
    callback('Kerberos must be at most 8 characters');
    return;
  }
  var getUserWithKerberos = this.getUserWithKerberos;
  this.getProfile(kerberos, function(err, profile) {
    var password = randomPassword();
    hashPassword(password, function(err2, hash) {
      if (err || err2) {
        callback(err || err2);
        return;
      }
      db.query().insert('next-users',
        ['kerberos', 'firstName', 'lastName',
        'roomNumber', 'email', 'password'],
        [kerberos, profile.firstName, profile.lastName,
        profile.roomNumber, kerberos + '@mit.edu', hash])
        .execute(function(err) {
          getUserWithKerberos(kerberos, function(err2, user) {
            if (err || err2) {
              callback(err || err2);
              return;
            }
            db.query().insert('next-guestlist', ['userID'], [user.id])
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
}

/*
 * Creates all users in the given kerberosList,
 *   and notifies all added users via email
 */
Users.prototype.createUsers = function(kerberosList, callback) {
  async.each(kerberosList, this.createUser.bind(this), callback);
}

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
  db.query().update('next-users',
      ['firstName', 'lastName', 'roomNumber'],
      [firstName, lastName, roomNumber])
    .where('id = ?', [this.id])
    .execute(callback);
}

/*
 * Updates this user's MIT ID.
 */
User.prototype.editMitID = function(mitID, callback) {
  db.query().update('next-users', ['mitID'], [mitID])
    .where('id = ?', [this.id])
    .execute(callback);
}

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
}

/*
 * Resets this user's password to a random default password,
 *   and notifies the user via email.
 */
User.prototype.resetPassword = function(callback) {
  var password = randomPassword();
  Mailer.resetPassword(this, password);
  this.changePassword(password, callback);
}

/*
 * Authenticate the user with the password.
 */
User.prototype.authenticate = function(password, callback) {
  bcrypt.compare(password, this.password, callback);
}

/*
 * Updates this user's group (for permissions).
 */
User.prototype.changeGroup = function(group, callback) {
  db.query().update('next-users', ['group'], [group])
    .where('id = ?', [this.id])
    .execute(callback);
}

/*
 * Removes this user.
 */
User.prototype.remove = function(callback) {
  db.query().deleteFrom('next-users').where('id = ?', [this.id])
    .execute(function(err) {
      if (err) {
        callback(err);
        return;
      }
      db.query().deleteFrom('next-guestlist')
      .where('userID = ?', [this.id])
      .execute(callback);
    });
}

module.exports.Users = new Users();
