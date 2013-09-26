var Database = require('./db');
var nodemailer = require('../node_modules/nodemailer');
var exec = require('child_process').exec;

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
// Takes a list of guests and an empty invalids list.
// Puts invalid guests into invalids list.
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
          var smtpTransport = nodemailer.createTransport("SMTP",{
            service: "Gmail",
            auth: {
              user: "sparkyroombot@gmail.com",
              pass: "pencilpencil"
            }
              });
            
            htmlEmail = "Hello " + firstName+ ", <br /><br />" + 
            "NextExec has approved your application for the small group project funding!<br /><br />"+
            "If you have any questions, feel free to contact nextres@mit.edu." +
            "<br /><br />" +
            "Cheers,<br />" +
            "NextExec";

            textEmail = "Hello, "+firstName+"NextExec has approved your application for the small group project funding! If you have any questions, feel free to contact nextres@mit.edu. Cheers, NextExec";
		
            var mailOptions = {
              from: "Next Resident Dashboard <sparkyroombot@gmail.com>", // sender address
              to: email, // list of receivers
              subject: "Request for Project Funding Approved", // Subject line
              text: textEmail, // plaintext body
              html: htmlEmail // html body
            /*cc: 'nextexec@mit.edu' */
            };
              
            smtpTransport.sendMail(mailOptions, function(error, response){
              if (error) {
      		      returnError += error + "\n";
                console.log(error);
              } else {
                console.log("Message sent: " + response.message);
                }
            });
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
          var smtpTransport = nodemailer.createTransport("SMTP",{
            service: "Gmail",
            auth: {
              user: "sparkyroombot@gmail.com",
              pass: "pencilpencil"
            }
              });
            
            // var url = "http://mplcr.mit.edu";
            htmlEmail = "Hello " + firstName+ ", <br /><br />" + 
            "NextExec has denied your application for the following reason(s): <br />" +
            reason +
            ".<br /><br />" +
            "You have the option to reapply and submit another funding proposal.<br /><br />" +
            "If you have any questions, feel free to contact nextres@mit.edu." +
            "<br /><br />" +
            "Cheers,<br />" +
            "NextExec";

            textEmail = "Hello, "+firstName+"NextExec has denied your application for the following reason(s): " + reason + ". You have the option to reapply and submit another funding proposal. If you have any questions, feel free to contact nextres@mit.edu. Cheers, NextExec";
		
            var mailOptions = {
              from: "Next Resident Dashboard <sparkyroombot@gmail.com>", // sender address
              to: email, // list of receivers
              subject: "Request for Project Funding Denied", // Subject line
              text: textEmail, // plaintext body
              html: htmlEmail // html body
              /*cc: 'nextexec@mit.edu' */
            };
              
            smtpTransport.sendMail(mailOptions, function(error, response){
              if (error) {
      		      returnError += error + "\n";
                console.log(error);
              } else {
                console.log("Message sent: " + response.message);
                }
            });
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
  var smtpTransport = nodemailer.createTransport("SMTP",{
              service: "Gmail",
              auth: {
                user: "sparkyroombot@gmail.com",
                pass: "pencilpencil"
              }
            });
            
            htmlEmail = "Hello,<br /><br />" + 
            "The password to your Next resident dashboard account has been reset. "+
            "Login with your kerberos ID and the following password: <b>" + rawPassword +
            "</b>. Once you have logged in, please change your password." +
            "<br /><br />" +
            "If you have any questions, feel free to contact nextres@mit.edu" +
            "<br /><br />" +
            "Cheers,<br />" +
            "Sparky, the Next House Mailbot";


            textEmail = "The password to your Next resident dashboard account has been reset. Login with your kerberos ID and the following password: " + rawPassword + "Once you have logged in, please change your password. If you have any questions, feel free to contact nextres@mit.edu. Cheers, Sparky, the Next House Mailbot";
		
            var mailOptions = {
              from: "Next Resident Dashboard <sparkyroombot@gmail.com>", // sender address
              to: kerberos + "@mit.edu", // list of receivers
              subject: "Testing Password Reset", // Subject line
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
            
            // var url = "http://mplcr.mit.edu";
            htmlEmail = "Hello!<br /><br />" + 
            "Your Next resident dashboard account has been created! Please " +
            "go to <a href='next.mit.edu'>next.mit.edu</a>, and click the " +
            "link on the top-right corner of the page. Login with your " +
            "kerberos ID and the following password: <b>" + passwordRaw +
            "</b>. Once you have logged in, please change your password." +
            "<br /><br />" +
            "If you have any questions, feel free to contact nextres@mit.edu" +
            "<br /><br />" +
            "Cheers,<br />" +
            "Sparky, the Next House Mailbot";


            textEmail = "Hello! Your Next resident dashboard account has been created! Please go to <a href='next.mit.edu'>next.mit.edu</a>, and click the link on the top-right corner of the page. Login with your kerberos ID and the following password: " + passwordRaw + "Once you have logged in, please change your password. If you have any questions, feel free to contact nextres@mit.edu. Cheers, Sparky, the Next House Mailbot";
		
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
