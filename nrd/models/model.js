var Database = require('./db');

function Model() {
  this.db = new Database();
}

// Can probably use joins but i hate joins

Model.prototype.getPermissions = function(id, callback) {
  console.log(id);
  var db = this.db;
  this.db.query()
    .select(["group"])
    .from("next-users")
    .where("id = ?", [ id ])
    .limit(1);
  var groupID;
  this.db.execute(function(error, result) {
    groupID = result[0].group;
    db.query()
      .select(["permissionID"])
      .from("next-group-permission")
      .where("groupID = ?", [ groupID ]);
    var userPermissions = [];
    db.execute(function(err, res) {
      for (var i = 0; i < res.length; i++) {
        userPermissions.push(res[i].permissionID);
      }
      db.query()
        .select("*")
        .from("next-permissions");
      var allPermissions = [];
      db.execute(function(err2, res2) {
        allPermissions = res2;
        var permissions = {};
        for (var i = 0; i < allPermissions.length; i++) {
           var permission = allPermissions[i];
           permissions[permission.name] = (userPermissions.indexOf(permission.id) >= 0);
        }
        callback(permissions);
      });
    });
  });
}

Model.prototype.addGuests = function(id, guests, callback) {
  columns = [];
  guestValues = [];
  for (var i = 0; i < 3; i++) {
    columns.push('guest' + (i + 1) + 'Name');
    columns.push('guest' + (i + 1) + 'Kerberos');
    guestValues.push(guests[i].name);
    guestValues.push(guests[i].kerberos);
  }
  this.db.query().
    update('next-guestlist',
           columns,
           guestValues).
    where('nextUser = ?', [ id ]);
  this.db.execute(function(error, result) {
    callback(error, result);
  });
}

Model.prototype.getGuests = function(id, callback) {
  console.log(id);
  this.db.query().
    select(['*']).
    from('next-guestlist').
    where('nextUser = ?', [ id ]).
    limit(1);
  var db = this.db;
  this.db.execute(function(error, result) {
    if (result==undefined) {
      db.query().
        insert('next-guestlist',
               ['nextUser'],
               [id]);
      db.execute(function(error, result) {
        callback(error, result);
      });
    } else {
      console.log(result);
      callback(error, result[0]);
    }
  });
}

Model.prototype.listGuests = function(id, callback) {
  this.db.query().raw("SELECT *" + 
					  "FROM  `next-users`" + 
					  "RIGHT JOIN  `next-guestlist` ON  `next-users`.id =  `next-guestlist`.nextUser");
  var db = this.db;
  this.db.execute(function(error, result) {
    console.log(error);
  	callback(error, result)
  })
}

// Finds a user with the given id, then calls the callback function

Model.prototype.findUser = function(id, callback) {
  this.db.query().
    select(['firstName', 'lastName', 'kerberos', 'id']).
    from('next-users').
    where('id = ?', [ id ]).
    limit(1);
  this.db.execute(function(error, result) {
    callback(error, result[0]);
  })
}

Model.prototype.listUsers = function(id, callback) {
	this.db.query().
	select(["*"]).
	from('next-users')
	this.db.execute(function(error, result) {
		callback(error, result)
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
    console.log(result);
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