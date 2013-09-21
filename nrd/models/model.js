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
    guestValues.push(guests[i].name.replace(/[^a-zA-Z0-9\- ]/g, ""));
    guestValues.push(guests[i].kerberos.replace(/[^a-zA-Z0-9\- ]/g, ""));
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

Model.prototype.listGuests = function(id, params, callback) {
  if (params.search !== undefined){
  	console.log('searching');
  	var s = "%" + params.value + "%";
  	this.db.query()
  	  .select(["*"])
  	  .from("next-users")
  	  .rightJoin("next-guestlist")
	  .on([["`next-users`.id", "`next-guestlist`.nextUser"]])
	  .where('firstName LIKE ? OR lastName LIKE ? OR kerberos LIKE ?', [s, s, s])
	  .orderBy(params.sort);
	  
	  console.log(this.db.queryString);
	  this.db.execute(function(error, result) {
	  	callback(error, result)
	  })
	  
  } else {
	  this.db.query()
	    .select(["*"])
	    .from("next-users")
	    .rightJoin("next-guestlist")
	    .on([["`next-users`.id", "`next-guestlist`.nextUser"]]);
	  this.db.execute(function(error, result) {
	    console.log(error);
	  	callback(error, result)
	  });
	}
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
	this.db.query()
	.select(["*"])
	.from('next-users')
	.rightJoin("next-groups")
	.on([["`next-users`.group", "`next-groups`.id"]]);;
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

Model.prototype.changePassword = function(id, newPassword, callback) {
  this.db.query().
    update('next-users', ['password'], [newPassword]).
    where('id = ?', [ id ]);
  this.db.execute(function(error, result) {
    console.log(error);
    console.log(result[0]);
    callback(error, result[0]);
  })
}

/*
    update('next-guestlist',
           columns,
           guestValues).
    where('nextUser = ?', [ id ]);
*/
    
Model.prototype.getUser = function(id, callback) {
  this.db.query().
    select(['*']).
    from('next-users').
    where('id = ?', [ id ]).
    limit(1);
  this.db.execute(function(error, result) {
    callback(error, result[0]);
  })
}

Model.prototype.updateUser = function(id, info, callback) {
  this.db.query().
    update('next-users', ['firstName','lastName','roomNumber'], [info.firstName.replace(/[^a-zA-Z0-9\- ]/g, ""), info.lastName.replace(/[^a-zA-Z0-9\- ]/g, ""), info.roomNumber.replace(/[^a-zA-Z0-9\- ]/g, "")]).
    where('id = ?', [ id ]);
  this.db.execute(function(error, result) {
    callback(error, result[0]);
  })
}
  
// Creates a new user

Model.prototype.createUser = function(kerberos, passwordHash, passwordRaw, callback) {
  
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
            var smtpTransport = nodemailer.createTransport("SMTP",{
              service: "Gmail",
              auth: {
                user: "sparkyroombot@gmail.com",
                pass: "pencilpencil"
              }
            });
            
            var url = "http://mplcr.mit.edu";
            htmlEmail = "Hello!<br /><br />" + 
			   "Your Next resident dashboard account has been created. Please login to "+ url +" with your Kerberos " +
			   "ID and the following password: <b>" + passwordRaw +
			   "</b>. Once you have logged in, please change your password.<br /><br />" +
			   "If you have any questions, feel free to contact nextexec@mit.edu <br /><br />" +
			   "Cheers,<br />" +
			   "Sparky, the Next House Mailbot";
			   
			textEmail = "Hello! Your Next resident dashboard account has been created. Please login to "+ url +" with your Kerberos ID and the following password: " + passwordRaw + ". Once you have logged in, please change your password. If you have any questions, feel free to contact nextexec@mit.edu. Cheers! Sparky, the Next House Mailbot";
		
            var mailOptions = {
              from: "Next Resident Dashboard <sparkyroombot@gmail.com>", // sender address
              to: kerberos + "@mit.edu", // list of receivers
              subject: "Your Next Resident Dashboard Account", // Subject line
              text: textEmail, // plaintext body
              html: htmlEmail // html body
            };
              
            smtpTransport.sendMail(mailOptions, function(error, response){
              if(error){
      		      returnError += error + "\n";
                console.log(error);
              } else {
                console.log("Message sent: " + response.message);
              }
            });
            
          }
        });
      });
    }
    
    callback(returnError, "");
    console.log(userCreated)
  });

}

Model.prototype.removeUser = function(kerberos, callback) {
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

module.exports = Model
