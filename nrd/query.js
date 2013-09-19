var db = require('./db');

function Query() {
  this.db = new Database();
}

Query.prototype.login = function(kerberos, passwordHash) {
  this.db.connect();
  this.db.query().
      select(['firstName', 'lastName']).
      from('next-users').
      where('password = ?', [ passwordHash ]).
      limit(1).
      execute(function(error, rows, cols) {
          if (error) {
            console.log('ERROR: ' + error);
            return false;
          } else {
            return rows
          }
      });
  });
}

Query.prototype.createUser = function(firstName, lastName, kerberos, passwordHash) {
  console.log(firstName + ' ' + lastName + )
  this.db.connect(function(error) {
    if (error) {
      return console.log('Connection error: ' + error);
    }
    this.query().
      insert('next-users',
             ['firstName', 'lastName', 'kerberos', 'email', 'password'],
             [firstName, lastName, kerberos, kerberos + '@mit.edu', passwordHash]
      ).
      execute(function (error, result) {
        if (error) {
          console.log('Error:' + error);
          return false;
        }
        console.log('Created user ' + kerberos);
      })
  })
}

module.exports = Database