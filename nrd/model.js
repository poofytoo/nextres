var Database = require('./db');

function Model() {
  this.db = new Database();
}

// Finds a user with the given id, then calls the callback function

Model.prototype.findUser = function(id, callback) {
  this.db.query().
    select(['firstName', 'lastName', 'kerberos']).
    from('next-users').
    where('id = ?', [ id ]).
    limit(1);
  this.db.execute(function(error, result) {
    callback(error, result[0]);
  })
}

// Finds the user with the given kerberos, to compare the password hash to
// Probs not that secure

Model.prototype.login = function(kerberos, callback) {
  console.log('kerberos: ' + kerberos);
  this.db.query().
      select(['*']).
      from('next-users').
      where('kerberos = ?', [ kerberos ]).
      limit(1);
  this.db.execute(function(error, result) {
    callback(error, result[0]);
  });
}

// Creates a new user

Model.prototype.createUser = function(firstName, lastName, kerberos, passwordHash) {
  console.log(firstName + ' ' + lastName + ' ' + kerberos);
  this.db.query().
    insert('next-users',
             ['firstName', 'lastName', 'kerberos', 'email', 'password'],
             [firstName, lastName, kerberos, kerberos + '@mit.edu', passwordHash]
      );

  this.db.execute(function (error, result) {
    if (error) {
      console.log('Error:' + error);
    }
    console.log('Created user ' + kerberos);
  });
}

module.exports = Model