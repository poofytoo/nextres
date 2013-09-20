var Database = require('./db');
var nodemailer = require('../node_modules/nodemailer');

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

Model.prototype.createUser = function(kerberos, passwordHash, passwordRaw) {
  
  // Creates a user 
  // TODO: check if user is already in the database. If so, return error and don't do anything
  this.db.query().
    insert('next-users',
             ['kerberos', 'email', 'password'],
             [kerberos, kerberos + '@mit.edu', passwordHash]
    );
    
  var userCreated = false;
  this.db.execute(function (error, result) {
    if (error) {
      console.log('Error:' + error);
    } else {
      // success
      console.log ('Created user: ' + kerberos);
      userCreated = true;
    }
  })
  
  console.log(userCreated)
  
  // If the user was created successfully, create a guestlist row for him & send an email
  // TODO: problem: this is executed before the above finishes running. Sadness
  if (userCreated) {
    this.db.query().
      select(['*']).
      from('next-users').
      where('kerberos = ?', [ kerberos ]).
      limit(1);
	this.db.execute(function(error, result) {
	  var nextUserId = result[0].id;
	});   
	  
    this.db.query().
      insert('next-guestlist', ['nextUser'], [nextUserId]);
    this.db.execute(function (error, result) {
      if (error) {
        console.log ('Error:' + error)
      } else {
      	console.log ('User Properties Created: ' + kerberos);
      		
      	//contacting user
      	var smtpTransport = nodemailer.createTransport("SMTP",{
		  service: "Gmail",
		  auth: {
		    user: "sparkyroombot@gmail.com",
		    pass: "pencilpencil"
		  }
		});
			
		var mailOptions = {
		  from: "Next Resident Dashboard <sparkyroombot@gmail.com>", // sender address
		  to: kerberos + "@mit.edu", // list of receivers
		  subject: "Your Next Resident Dashboard Account", // Subject line
		  text: "pw: " + passwordRaw, // plaintext body
		  html: "pw:" + passwordRaw // html body
		}
			
		smtpTransport.sendMail(mailOptions, function(error, response){
		  if(error){
		    console.log(error);
		  } else {
		    console.log("Message sent: " + response.message);
		  }
		});
      }
    })
  }
}

module.exports = Model