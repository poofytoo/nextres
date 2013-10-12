var Database = require('./db');
var Email = require('./email');

var exec = require('child_process').exec;

function User() {
  this.db = new Database();
  this.email = new Email();
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

User.prototype.listUsers = function(id, callback) {
  this.db.query()
  .select(["*"])
  .from('next-users')
  .rightJoin("next-groups")
  .on("`next-users`.group=`next-groups`.id");
  this.db.execute(function(error, result) {
    callback(error, result)
  })
}

// Finds the user with the given kerberos, to compare the password hash to
// Probs not that secure

User.prototype.login = function(kerberos, callback) {
  console.log('kerberos: ' + kerberos);
  this.db.query().
      select(['*']).
      from('next-users').
      where('kerberos = ?', [ kerberos ]).
      limit(1);
  this.db.execute(function(error, result) {
    console.log(result);
    callback(error, result[0]);
  });
}

User.prototype.changePassword = function(id, newPassword, callback) {
  this.db.query().
    update('next-users', ['password'], [newPassword]).
    where('id = ?', [ id ]);
  this.db.execute(function(error, result) {
    console.log(error);
    console.log(result[0]);
    callback(error, result[0]);
  })
}

//reset password and notify user via email
User.prototype.resetPassword = function(id, hash, rawPassword, kerberos, callback) {
  this.db.query().
    update('next-users', ['password'], [hash]).
    where('id = ?', [ id ]);
  
  // Send email
  this.email.resetPasswordEmail(rawPassword, kerberos);

  this.db.execute(function(error, result) {
    console.log(error);
    console.log(result[0]);
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
  var email = this.email;
  var returnError = "";
  
  console.log('hi');

  this.db.execute(function (error, result) {
    if (error) {
      console.log('INSERT ERROR: ' + error);
      returnError += error + "\n";
    } else {
      // success
      console.log ('Created user: ' + kerberos);
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
            console.log ('Error:' + error)
          } else {
            console.log ('User Properties Created: ' + kerberos);
              
            //contacting user
            email.newUserEmail(returnError, passwordRaw, kerberos);
          }
        });
      });
    }
    
    callback(returnError, "");
    console.log(userCreated)
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
      console.log('Error: ' + error);
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
          console.log('Error: ' + error);
        } else {
          console.log('User Removed: ' + kerberos);
        }
      callback(returnError);
      });
      db.query().
        deleteFrom('next-guestlist').
        where('nextUser = ?', [nextUserId]).
        limit(1);
      db.execute(function(error, result) {
        if (error) {
          console.log('Error: ' + error);
        }
      });
    }
  });
}

module.exports = User