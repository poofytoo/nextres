var Database = require('./db');

function Model() {
  this.db = new Database();
}

Model.prototype.login = function(kerberos, callback) {
  console.log('kerberos: ' + kerberos);
  this.db.query().
      select(['*']).
      from('next-users').
      where('kerberos = ?', [ kerberos ]).
      limit(1);
  this.db.execute(function(error, result) {
    console.log(result);
    console.log(error);
    callback(error, result[0]);
  });
}


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