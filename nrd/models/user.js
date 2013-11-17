var Database = require('./db');
var mailer = require('./mailer');
var logger = require('./logger');

var exec = require('child_process').exec;

function User() {
  this.db = new Database();
}

// Finds a user with the given id, then calls the callback function

User.prototype.findUser = function(id, callback) {
  this.db.query().
    select(['firstName', 'lastName', 'kerberos', 'id']).
    from('next-users').
    where('id = ?', [ id ]).
    limit(1);
  this.db.execute(function(error, result) {
    callback(error, result[0]);
  })
}

// Lists All Users

User.prototype.listUsers = function(id, callback) {
  this.db.query()
  .select(["*"])
  .from('next-users')
  .rightJoin("next-groups")
  .on("`next-users`.group=`next-groups`.id");
  var db = this.db;
  this.db.execute(function(error, result) {
  	db.query()
  	.select(["*"])
  	.from('next-groups')
  	db.execute(function(error, allroles){
  	  console.log(allroles);
      callback(error, result, allroles)
  	})
  })
}

// Finds the user with the given kerberos, to compare the password hash to
// Probs not that secure

User.prototype.login = function(kerberos, callback) {
  logger.info('kerberos: ' + kerberos);
  this.db.query().
      select(['*']).
      from('next-users').
      where('kerberos = ?', [ kerberos ]).
      limit(1);
  this.db.execute(function(error, result) {
    logger.info(result);
    callback(error, result[0]);
  });
}

User.prototype.changePassword = function(id, newPassword, callback) {
  this.db.query().
    update('next-users', ['password'], [newPassword]).
    where('id = ?', [ id ]);
  this.db.execute(function(error, result) {
    if (error) {
      logger.error(error);
    }
    logger.info(result[0]);
    callback(error, result[0]);
  })
}

//reset password and notify user via email
User.prototype.resetPassword = function(id, hash, rawPassword, kerberos, callback) {
  this.db.query().
    update('next-users', ['password'], [hash]).
    where('id = ?', [ id ]);

  mailer.resetPassword(kerberos, rawPassword);

  this.db.execute(function(error, result) {
    if (error) {
      logger.error(error);
    }
    logger.info(result[0]);
    callback(error, result[0]);
  })
}

User.prototype.getUser = function(id, callback) {
  this.db.query().
    select(['*']).
    from('next-users').
    where('id = ?', [ id ]).
    limit(1);
  this.db.execute(function(error, result) {
    callback(error, result[0]);
  })
}

User.prototype.getKerberos = function(kerberos, callback) {
  this.db.query().
    select(['*']).
    from('next-users').
    where('kerberos = ?', [ kerberos ]).
    limit(1);
  this.db.execute(function(error, result) {
    callback(error, result[0]);
  })
}

User.prototype.updateUser = function(id, info, callback) {
  this.db.query().
    update('next-users', ['firstName','lastName','roomNumber'], [info.firstName.replace(/[^a-zA-Z0-9\-_ ]/g, ""), info.lastName.replace(/[^a-zA-Z0-9\-_ ]/g, ""), info.roomNumber.replace(/[^a-zA-Z0-9\-_ ]/g, "")]).
    where('id = ?', [ id ]);
  this.db.execute(function(error, result) {
    callback(error, result[0]);
  })
}
  
// Creates a new user

User.prototype.createUser = function(kerberos, passwordHash, passwordRaw, callback) {
  
  // Creates a user 
  // TODO: check if user is already in the database. If so, return error and don't do anything
  this.db.query().
    insert('next-users',
             ['kerberos', 'email', 'password'],
             [kerberos, kerberos + '@mit.edu', passwordHash]
    );
    
  var userCreated = false;
  var db = this.db;
  var returnError = "";
  
  this.db.execute(function (error, result) {
    if (error) {
      logger.error('INSERT ERROR: ' + error);
      returnError += error + "\n";
    } else {
      // success
      logger.info('Created user: ' + kerberos);
      db.query().
        select(['*']).
        from('next-users').
        where('kerberos = ?', [ kerberos ]).
        limit(1);
      db.execute(function(error, result) {
        var nextUserId = result[0].id;
        db.query().
          insert('next-guestlist', ['nextUser'], [nextUserId]);
        db.execute(function (error, result) {
          if (error) {
            returnError += error + "\n";
            logger.error('Error:' + error)
          } else {
            logger.info('User Properties Created: ' + kerberos);
            mailer.newUser(kerberos, passwordRaw);
          }
        });
      });
    }
    
    callback(returnError, "");
    logger.info(userCreated)
  });

}

User.prototype.removeUser = function(kerberos, callback) {
  var returnError = "";
  var db = this.db;

  this.db.query().
    select(['*']).
    from('next-users').
    where('kerberos = ?', [ kerberos ]).
    limit(1);
  db.execute(function(error, result) {
    if (error) {
      returnError += error + "\n";
      logger.error('Error: ' + error);
      callback(returnError);
    } else {
      var nextUserId = result[0].id;
      db.query().
        deleteFrom('next-users').
        where('kerberos = ?', [ kerberos ]).
        limit(1);
      db.execute(function(error, result) {
        if (error) {
          returnError += error + "\n";
          logger.error('Error: ' + error);
        } else {
          logger.info('User Removed: ' + kerberos);
        }
      callback(returnError);
      });
      db.query().
        deleteFrom('next-guestlist').
        where('nextUser = ?', [nextUserId]).
        limit(1);
      db.execute(function(error, result) {
        if (error) {
          logger.error('Error: ' + error);
        }
      });
    }
  });
}

module.exports = User
