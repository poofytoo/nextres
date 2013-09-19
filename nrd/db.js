var mysql = require('node-db-mysql');


function Database() {
  this.db = new mysql.Database({
      hostname: 'sql.mit.edu',
      user: 'next',
      password: '645cf777',
      database: 'next+nextres'
  });
}

Database.prototype.login = function(kerberos, passwordHash) {
  this.db.connect(function(error) {
      if (error) {
          return console.log('CONNECTION error: ' + error);
      }
      this.query().
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

module.exports = Database