var Database = require('./db');
var Email = require('./email');

var nodemailer = require('../node_modules/nodemailer');
var exec = require('child_process').exec;

function Model() {
  this.db = new Database();
  this.email = new Email();
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

Model.prototype.submitApp = function(id, responseFields, callback) {
  columns = ['nextUser','groupMembers','projectDescription', 'reasonForFunding', 
             'communityBenefit', 'peopleInvolved', 'requestedAmount', 
             'costBreakdown', 'Status', 'dateTime', 'Timestamp'];
  responses = [id];
  for (var i = 0; i < 7; i++) {
    responses.push(responseFields[i]);
  }
  responses.push('Pending'); // Set 'Status' to 'Pending'
  d = new Date(); 
  var dateTime = d.getMonth()+1+'/'+d.getDate()+'/'+d.getFullYear()+'_'
                +d.getHours()+':'+d.getMinutes()+':'+d.getSeconds();
  responses.push(dateTime)
  responses.push(Date.now()+''); // Timestamp
  this.db.query().
    insert('next-project-funding',
           columns,
           responses);
  this.db.execute(function(error, result) {
    callback(error, result);
  });
}

Model.prototype.getApp = function(id, callback) {
  console.log(id);
  this.db.query().
    select(['*']).
    from('next-project-funding').
    where('nextUser = ?', [ id ]).
    orderByDESC('Timestamp'); // Selects most recent application
  var db = this.db;
  this.db.execute(function(error, result) {
    console.log(id);
    if (result==undefined) {
      db.execute(function(error, result) {
        callback(error, result);
      });
    } else {
      console.log(result);
      callback(error, result[0]);
    }
  });
}


// Very dirty kerberos validation
Model.prototype.validateKerberos = function(guests, callback) {
  var count = guests.length;
  var invalids = [];
  for (var i = 0; i < guests.length; i++) {
    var kerberos = guests[i].kerberos.replace(/[^a-zA-Z0-9\-_ ]/g, "");
    if (kerberos === '') {
      count--;
    } else {
      (function(kerberos) {
        exec('finger ' + kerberos + '@athena.dialup.mit.edu',
            function(error, stdout, stderr) {
              if (stdout.indexOf('no such user.') != -1) {
                invalids.push(kerberos);
              }
              if (--count == 0) {
                callback(invalids);
              }
            });
      })(kerberos);
    }
  }
}

// Returns whether given kerberos is guest of someone at Next
Model.prototype.onGuestList = function(id, guests, callback) {
  var count = guests.length;
  var onGuestLists = [];
  var db = this.db;
  for (var i = 0; i < guests.length; i++) {
    var kerberos = guests[i].kerberos.replace(/[^a-zA-Z0-9\-_ ]/g, "");
    if (kerberos === '') {
        count--;
    } else {
      (function(kerberos) {
        db.query()
        .select(["firstName", "lastName"])
        .from("next-guestlist")
        .rightJoin("next-users")
        .on("`next-guestlist`.nextUser=`next-users`.id")
        .where("`next-users`.id != ? AND " +
            "( guest1Kerberos LIKE ? OR guest2Kerberos LIKE ? OR guest3Kerberos LIKE ? )",
                [id, kerberos, kerberos, kerberos]);
        db.execute(function(err, res) {
          if (res && res.length > 0) {
            res[0].kerberos = kerberos;
              onGuestLists.push(res[0]);
          }
          if (--count == 0) {
            callback(onGuestLists);
          }
        });
      })(kerberos);
    }
  }
}

Model.prototype.addGuests = function(id, guests, callback) {
  columns = [];
  guestValues = [];
  for (var i = 0; i < 3; i++) {
    columns.push('guest' + (i + 1) + 'Name');
    columns.push('guest' + (i + 1) + 'Kerberos');
    guestValues.push(guests[i].name.replace(/[^a-zA-Z0-9\-_ ]/g, ""));
    guestValues.push(guests[i].kerberos.replace(/[^a-zA-Z0-9\-_ ]/g, ""));
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
	  .on("`next-users`.id=`next-guestlist`.nextUser")
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
	    .on("`next-users`.id=`next-guestlist`.nextUser");
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
	.on("`next-users`.group=`next-groups`.id");
	this.db.execute(function(error, result) {
		callback(error, result)
	})
}

// Lists pending small group funding applications

Model.prototype.listApps = function(id, callback) {
	this.db.query()
	.select(["*"])
	.from('next-project-funding')
        .where('Status = ?', [ 'Pending' ]);
	this.db.execute(function(error, result) {
		callback(error, result)
	})
}

// Approve funding application & notify user via e-mail

Model.prototype.approveApp = function(timestamp, email, firstName, callback) {
  var returnError = "";
  var db = this.db;
  var email = this.email;
  this.db.query().
  update('next-project-funding',
        ['Status'],
        ['Approved']).
   where('dateTime = ?', [ timestamp ]);  // Change Status from 'Pending' to 'Approved'
    db.execute(function(error, result) {
      if (error) {
        returnError += error + "\n";
        console.log('Error: ' + error);
      } else {
        console.log('Application approved: ' + timestamp);

        //contacting user
        email.approveEmail(firstName, email);
      }
    callback(returnError);
    });    
    db.execute(function(error, result) {
      if (error) {
        console.log('Error: ' + error);
      }
    });
}

// Deny funding application & notify user via e-mail.

Model.prototype.denyApp = function(timestamp, reason, email, firstName, callback) {
  var returnError = "";
  var db = this.db;
  var email = this.email;
  var denied = 'Denied - '+reason;
  this.db.query().
  update('next-project-funding',
        ['Status'],
        [denied]).                       // Change Status from 'Pending' to 'Denied-' with reason given.
   where('dateTime = ?', [ timestamp ]); 
   db.execute(function(error, result) {
     if (error) {
        returnError += error + "\n";
        console.log('Error: ' + error);
     } else {
        console.log('Application denied: ' + timestamp);

        //contacting user
        email.denyEmail(firstName, email, reason);
      }    
  callback(returnError);
  });
  db.execute(function(error, result) {
      if (error) {
        console.log('Error: ' + error);
      }
  });
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

//reset password and notify user via email
Model.prototype.resetPassword = function(id, hash, rawPassword, kerberos, callback) {
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

Model.prototype.getKerberos = function(kerberos, callback) {
  this.db.query().
    select(['*']).
    from('next-users').
    where('kerberos = ?', [ kerberos ]).
    limit(1);
  this.db.execute(function(error, result) {
    callback(error, result[0]);
  })
}

Model.prototype.updateUser = function(id, info, callback) {
  this.db.query().
    update('next-users', ['firstName','lastName','roomNumber'], [info.firstName.replace(/[^a-zA-Z0-9\-_ ]/g, ""), info.lastName.replace(/[^a-zA-Z0-9\-_ ]/g, ""), info.roomNumber.replace(/[^a-zA-Z0-9\-_ ]/g, "")]).
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
            email.newUserEmail(passwordRaw, kerberos);
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

Model.prototype.getFiles = function(callback) {
  this.db.query().
    select(['*']).
    from('next-minutes').
    orderBy('date');
  this.db.execute(function(error, result) {
    callback(error, result);
  });
}

Model.prototype.addFile = function(name, date, callback) {
  this.db.query().
    insert('next-minutes', ['name', 'date'], [name, date]);
  this.db.execute(function(error, result) {
    callback(error);
  });
}

Model.prototype.removeFile = function(name, callback) {
  this.db.query().
    deleteFrom('next-minutes').
    where('name = ?', [name]).
    limit(1);
  this.db.execute(function(error, result) {
    callback(error);
  });
}

module.exports = Model
