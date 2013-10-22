
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var bcrypt = require('bcrypt');
var Consolidate = require('consolidate');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var Model = require('./models/model');
var reservations = require('./models/reservations');
var hbs = require('hbs');
var fs = require('fs');
var nodemailer = require('nodemailer');

var model = new Model();

var app = express();

// all environments

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.engine('html', require('hbs').__express);
app.set('view options', {layout: false});

hbs.registerPartials(__dirname + '/views/partials');

app.use(express.favicon(__dirname + '/public/images/favicon.ico')); 
app.use(express.cookieParser());
app.use(express.logger('dev'));

app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.session({ secret: 'SECRET' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);

function registerContent(content) {
  var contentDir = __dirname + '/views/partials/' + content + '.html';
  var content = fs.readFileSync(contentDir, 'utf8');
  hbs.registerPartial('content', content);
}

passport.use(new LocalStrategy(
  function(username, password, done) {
    model.login(username, function(error, res) {
      if (error !== null) { 
      	return done(null, false); 
      }
      if (res !== undefined) {
	      bcrypt.compare(password, res.password, function(err, authenticated) {
	        if (!authenticated) {
	          return done(null, false);
	        } else {
	          return done(null, {id: res.id.toString(),
                             username: res.kerberos,
                             firstName: res.firstName,
                             lastName: res.lastName});
	        }
	      });
      } else {
      	return done(null, false);
      }
    });
  })
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  model.findUser(id, function(error, user) {
    return done(null, user);
  });
});

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', 
	passport.authenticate('local', { successRedirect: '/base.html',
                                   failureRedirect: '/login' }),
  function(req, res) {
    registerContent('home');
    model.getPermissions(req.user.id, function(permissions) {
      res.render('base.html', {'user': req.user, 'permissions': permissions});
    });
  }
);

//TODO: fix this to actually use FailureFlash

app.get('/loginfail', function(req, res) {
    res.render('login.html', {'error': true});
});

app.post('/login',
  passport.authenticate('local', {
  	failureRedirect: '/loginfail'
  }),
  function(req, res) {
  	if (req.user.id) {
    // If this function gets called, authentication was successful.
    // `req.user` contains the authenticated user.
      console.log('login success: ' + req.user.username);
      registerContent('home');
      model.getPermissions(req.user.id, function(permissions) {
        res.render('base.html', {'user': req.user, 'permissions': permissions});
      });
  	}
  }
);


// this is probably very unsecure..
app.post('/pwreset', function(req, res) {
      console.log(req.body);
  if (req.user !== undefined) {
      kerberos = req.body.kerberos;
      model.getKerberos (kerberos, function(error, result) {
        console.log(result);
        if (result!==undefined) {
        id = result['id'];
        var newPassword = randomPassword();
        console.log(newPassword);
        bcrypt.genSalt(10, function(err, salt) {
              bcrypt.hash(newPassword, salt, function(err, hash) {
                model.resetPassword(id, hash, newPassword, kerberos, function(error, result) {});
              }); 
        });
        } else {
          }
         });
   } else {
     res.render('login.html'); 
     } 

});



app.get('/login', function(req, res) {
  if (req.user !== undefined) {
  	res.redirect('/manage');
  } else {
  	res.render('login.html');
  }
});

app.get('/logout', function(req, res) {
  req.session.regenerate(function() {

    req.logout();
  registerContent('home');
  res.redirect('/');
  });
});

app.get('/home', function(req, res) {
  if (req.user !== undefined) {
	registerContent('home');
    model.getPermissions(req.user.id, function(permissions) {
      res.render('base.html', {'user': req.user, 'permissions': permissions});
    });
  } else {
  	res.render('login.html');
  }
});

app.get('/manage', function(req, res) {
  if (req.user !== undefined) {
    console.log(req.user);
    model.getGuests(req.user.id, function(error, result) {
      guests =[]
      for (var i = 1; i <= 3; i++) {
        info = {name: result['guest' + i + 'Name'],
                kerberos: result['guest' + i + 'Kerberos']};
        guests.push(info);
      }
      registerContent('manage');
      model.getPermissions(req.user.id, function(permissions) {
        res.render('base.html', {'user': req.user,
                                 'permissions': permissions,
                                 'guests': guests});
      });
    });
  } else {
  	res.redirect('/login');
  }
});


app.post('/manage', function(req, res) {
  console.log(req.user);
  if (req.user !== undefined) {
    guests = [];
    for (var i = 0; i < 3; i++) {
      info = {name: req.body['guest' + i + 'Name'],
              kerberos: req.body['guest' + i + 'Kerberos']};
      guests.push(info);
    }
    model.validateKerberos(guests, function(invalids) {
      var id = req.user.id;
      if (invalids.length == 0) {
        model.addGuests(id, guests, function(error, result) {
          registerContent('manage');
          model.onGuestList(id, guests, function(onGuestLists) {
            model.getPermissions(id, function(permissions) {
              var success = 'Your guest list has been updated.';
              res.render('base.html', {'user': req.user,
                'permissions': permissions,
                'guests': guests,
                'success': success,
                'alreadyHere': onGuestLists});
            });
          });
        });
      } else {
        model.getPermissions(id, function(permissions) {
          var error = 'Invalid kerberos: ' + invalids.join(', ');
          res.render('base.html', {'user': req.user,
            'permissions': permissions,
            'guests': guests,
            'error': error});
        });
      }
    });
  } else {
  	res.redirect('/login');
  }
});

// If application 'Pending', redirect and do not allow another submission. If most recent application 'Denied', notify user and allow resubmission.
app.get('/application', function(req, res) {
  console.log(req.user);
  if (req.user !== undefined) {
      model.getApp(req.user.id, function(error, result) {
        console.log(result);     
        if (result !== undefined) {
           if (result['Status']=='Pending'){ 
             registerContent('appcompleted');
             model.getPermissions(req.user.id, function(permissions) {
             res.render('base.html', {'user': req.user,
                                   'permissions': permissions});
             });
           } else if (result['Status'].substring(0,6)=='Denied') { 
                    registerContent('application');
                    model.getPermissions(req.user.id, function(permissions) {
                    var message = "Note: Your most recent application for was denied (check e-mail for reasons). You have the option of reapplying.";
                    res.render('base.html', {'user': req.user,
                                             'permissions': permissions,
                                             'error': message});
                    });
             } else if (result['Status'].substring(0,8)=='Approved') { 
                    registerContent('application');
                    model.getPermissions(req.user.id, function(permissions) {
                    res.render('base.html', {'user': req.user,
                                             'permissions': permissions});
                    });
              }
         } else {
                 registerContent('application');
                 model.getPermissions(req.user.id, function(permissions) {
                 res.render('base.html', {'user': req.user,
                                         'permissions': permissions});
                 });
           }
      });
  } else {
  	res.redirect('/login');
  }
});


app.post('/application', function(req, res) {
  console.log(req.user);
  console.log(req.body);
  var id = req.user.id;
  if (req.user !== undefined) {
    var emptyFields = false;
    for (var i = 1; i <= 7; i++) {
        if (req.body['responseField' + i].replace(' ','') == "") emptyFields = true;
    } // check that all required fields are completed
    if (emptyFields) {
      registerContent('application');
        model.getPermissions(id, function(permissions) {
          var error = '* Complete all required fields.';
          res.render('base.html', {'user': req.user,
              'permissions': permissions,
              'error': error});
        });
    }
    else {
      responses = []
      for (var i = 1; i <= 7; i++) {
        responses.push(req.body['responseField' + i]);
      } 
      model.submitApp(id, responses, function(error, result) { 
        registerContent('appcompleted');
        model.getPermissions(id, function(permissions) {
          var success = 'Thank you! Your application has been submitted.';
          res.render('base.html', {'user': req.user,
              'permissions': permissions,
              'success': success});
        });
      });
    }
  } else {
  	res.redirect('/login');
  }
});

app.post('/remove', function(req, res) {
  console.log(req.body);
  if (req.user !== undefined) {
    model.removeUser(req.body.kerberos, function (error) {
      if (error) {
        res.json({okay:false});
      } else {
        res.json({okay:true});
      }
    });
  } else {
    res.redirect('/login');
  }
});

app.get('/allguests', function(req, res) {
  if (req.user !== undefined) {
    console.log(id);
    params = {};
    var id = req.user.id
    model.listGuests(id, params, function(error, result) {
    	console.log(result);
      registerContent('allguests');
      model.getPermissions(req.user.id, function(permissions) {
        res.render('base.html', {user: req.user, result: result, permissions: permissions});
      });
    });
  } else {
    res.redirect('/login');
  }
});

app.get('/roomreservations', function(req, res) {
  if (req.user !== undefined) {
    registerContent('roomreservations');
    model.getPermissions(req.user.id, function(permissions) {
      reservations.getEventsWithUser(req.user, function(userEvents, allEvents) {
        res.render('base.html', {
          user: req.user,
          permissions: permissions,
          userEvents: userEvents,
          allEvents: allEvents
        });
      });
    });
  } else {
    res.redirect('/login');
  }
});

app.post('/roomreservations', function(req, res) {
  if (req.user !== undefined) {
    reservations.reserve(req.user, req.body, function(result) {
      registerContent('roomreservations');
      model.getPermissions(req.user.id, function(permissions) {
        reservations.getEventsWithUser(req.user, function(userEvents) {
          res.render('base.html', {
            user: req.user,
            permissions: permissions,
            success: result.success,
            error: result.error,
            userEvents: userEvents
          });
        });
      });
    });
  } else {
    res.redirect('/login');
  }
});

app.delete('/roomreservations', function(req, res) {
  if (req.user !== undefined) {
    reservations.removeReservation(req.body.id, function(err) {
      res.json({'okay': !err});
    });
  } else {
    res.redirect('/login');
  }
});

//Manage Reservations
app.get('/managereservations', function(req, res) {
  if (req.user !== undefined) {
    registerContent('managereservations');
    model.getPermissions(req.user.id, function(permissions) {
      reservations.getEventsWithUser(req.user, function(userEvents, allEvents) {
        res.render('base.html', {
          user: req.user,
          permissions: permissions,
          userEvents: userEvents,
          allEvents: allEvents
        });
      });
    });
  } else {
    res.redirect('/login');
  }
});

app.post('/roomreservationdeny', function(req, res) {
  if (req.user !== undefined) {
    reservations.denyReservation(req.body.id, req.body.reason, function(err) {
      res.json({'okay': !err});
    });
  } else {
    res.redirect('/login');
  }
});

app.get('/allusers', function(req, res) {
  if (req.user !== undefined) {
    var id = req.user.id;
    console.log(id);
    
    model.listUsers(id, function(error, result) {
      registerContent('allusers');
      model.getPermissions(req.user.id, function(permissions) {
      	res.render('base.html', {user: req.user, result: result, permissions: permissions});
      });
    });
  } else {
    res.redirect('/login');
  }
});

app.get('/reviewapps', function(req, res) {
  if (req.user !== undefined) {
    var id = req.user.id;
    console.log(id);
    model.listApps(id, function(error, result) {
      registerContent('reviewapps');
      if (result==undefined) {
        model.getPermissions(req.user.id, function(permissions) {
      	res.render('base.html', {user: req.user, result: result, permissions: permissions});
        });
      } else {
             model.getPermissions(req.user.id, function(permissions) {
      	     res.render('base.html', {user: req.user, result: result, permissions: permissions});
        });
        }
    });
  } else {
    res.redirect('/login');
  }
});

app.post('/reviewapps', function(req, res) {
  console.log(req.body);
  if (req.user !== undefined) {
    var id = req.user.id;
    model.getUser (id, function(error, result) {
    console.log(result);
    if (req.body['decision0'] == 'approve') {
      model.approveApp(req.body['timestamp0'], result['email'], result['firstName'], function (error) {  
        registerContent('reviewapps');
        model.getPermissions(id, function(permissions) {
          var success = 'Application approved. Applicant has been notified.';
          res.render('base.html', {'user': req.user,
              'permissions': permissions,
              'success': success});
        });
      });
    } else if (req.body['decision0'] == 'deny') {
        model.denyApp(req.body['timestamp0'], req.body['reason0'], result['email'], result['firstName'], function (error) {  
          registerContent('reviewapps');
          model.getPermissions(id, function(permissions) {
          var error = 'Application denied. Applicant has been notified.';
          res.render('base.html', {'user': req.user,
              'permissions': permissions,
              'error': error});
          });
        });
       } else if (req.body['decision0'] == undefined) {  
          registerContent('reviewapps');
          model.getPermissions(id, function(permissions) {
          var error = 'Approve/deny not selected for first application listed. Please try again.' ;
          res.render('base.html', {'user': req.user,
              'permissions': permissions,
              'error': error});
          });
        }
     });
   } else {
    res.redirect('/login');
  }
});

app.get('/residentinfo', function(req, res) {
  if (req.user !== undefined) {
    
    model.getUser(req.user.id, function(error, result) {
      var info = result;
      registerContent('residentinfo');
      console.log(info);
      model.getPermissions(req.user.id, function(permissions) {
        res.render('base.html', {'user': req.user, 'permissions': permissions, 'info': info});
      });
    });
  } else {
  	res.redirect('/login');
  }
});

app.post('/residentinfo', function(req, res) {
  if (req.user !== undefined) {
  	info = {};
  	info.firstName = req.body.firstname;
  	info.lastName = req.body.lastname;
  	info.roomNumber = req.body.roomnumber;
  	
    model.updateUser(req.user.id, info, function(error, result) {
	    model.getUser(req.user.id, function(error, result) {
	      var info = result;
	      registerContent('residentinfo');
	      console.log(info);
	      model.getPermissions(req.user.id, function(permissions) {
	      	var success = "Your residence info has been updated."
	        res.render('base.html', {'user': req.user, 'permissions': permissions, 'info': info, 'success': success});
	      });
	    });
    });
  } else {
  	res.redirect('/login');
  }
});

app.get('/searchguestlist', function(req, res) {
  var id = req.user.id;
	model.listGuests(id, req.query, function(error, result) {
	  if (result !== undefined){
	    console.log("this works");
	    // Lol, I'm just going to render the HTML here.
	    // TODO: CONVERT TO CLIENT SIDE HANDLEBAR PARSING
	    html = ""
	    for (key in result) {
	      var entry = result[key];
	      html += '<tr>';
	      html += '<td>' + entry.kerberos + '</td>';
	      html += '<td>' + entry.firstName + ' ' + entry.lastName + '</td>';
	    	for (i = 1; i <= 3; i ++) {
	    		html += '<td>';
	    		if (entry['guest' + i + 'Kerberos']){
	    			html += entry['guest' + i + 'Kerberos'] + " (" + entry['guest' + i + 'Name'] + ")";
	    		} else {
	    			html += '<span class="empty">empty</span>';
	    		}
	    		html += '</td>';
	    	}
	    	html += '</tr>';
	    }
	  	res.end(html);
	  } else {
	  	res.end("None");
	  }
	}); 
})

app.get('/changepassword', function(req, res) {
  if (req.user !== undefined) {
    var id = req.user.id;
    console.log(id);
    
    registerContent('changepassword');
    model.getPermissions(req.user.id, function(permissions) {
      res.render('base.html', {'user': req.user, 'permissions': permissions});
    });
  } else {
    res.redirect('/login');
  }
});

app.post('/changepassword', function(req, res) {
  if (req.user !== undefined) {
    var id = req.user.id;
    var oldPassword = req.body.oldpassword;
    var newPassword = req.body.newpassword;

    model.login(req.user.kerberos, function(error, result) {
      if (result !== undefined) {
        bcrypt.compare(oldPassword, result.password, function(err, authenticated) {
          if (!authenticated) {
            registerContent('changepassword');
            model.getPermissions(req.user.id, function(permissions) {
              var error = "Your current password is incorrect!";
              res.render('base.html', {'user': req.user, 'permissions': permissions, 'error' : error});
            });
          } else {
          
          	// THIS HERE IS A CALLBACK TREE. GOOD LUCK, FUTURE DEVS.
            console.log('correct password');
            bcrypt.genSalt(10, function(err, salt) {
              bcrypt.hash(newPassword, salt, function(err, hash) {
                model.changePassword(id, hash, function(error, result) {
                  registerContent('changepassword');
                  model.getPermissions(req.user.id, function(permissions) {
                  	var success = "Your password has been changed!";
                    res.render('base.html', {'user': req.user, 'permissions': permissions, 'success' : success});
                  });
                });
              });
            })
          }
        });
      }
    });
    // bcrypt.genSalt(10, function(err, salt) {
    //   bcrypt.hash(oldPassword, salt, function(err, oP) {
    //   	var oldPassword = oldPassword;
    //   	bcrypt.hash(newPassword, salt, function(err, nP) {
    //   	  console.log(id)
		  // model.changePassword(id, oldPassword, newPassword, function(error, result) {
		  //   console.log(error);	
		  // });
    //   	});
    //   });
    // });
  } else {
    res.redirect('/login');
  }
})


/*

    guests = [];
    for (var i = 0; i < 3; i++) {
      info = {name: req.body['guest' + i + 'Name'],
              kerberos: req.body['guest' + i + 'Kerberos']};
      guests.push(info);
    }
    var id = req.user.id;
    model.addGuests(id, guests, function(error, result) {
      model.getGuests(id, function(error, result) {
        guests =[];
        for (var i = 1; i <= 3; i++) {
          info = {name: result['guest' + i + 'Name'],
                  kerberos: result['guest' + i + 'Kerberos']};
          guests.push(info);
        }
        registerContent('manage');
        model.getPermissions(req.user.id, function(permissions) {
          res.render('base.html', {'user': req.user,
                                   'permissions': permissions,
                                   'guests': guests});
        });
      });
    });
    */

var randomPassword = function()
{
  var text = "";
  var possible = "abcdefghjkmnpqrstuvwxyz23456789";
  for (var i=0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}


// TODO: remove individual signup
/*
app.post('/signup', function(req, res) {
  var errorLog = "";
  bcrypt.genSalt(10, function(err, salt) {
  	pw = randomPassword();
    bcrypt.hash(pw, salt, function(err, hash) {
      model.createUser(req.body.kerberos,
                          hash, pw, function(error, result) {
                          	errorLog += error;
                          });
      model.getPermissions(req.user.id, function(permissions) {
      
        registerContent('allusers');
        res.render('base.html', {'user': req.user, 'permissions': permissions, 'error' : errorLog});
      });
    });
  });
});
*/


// TODO: client sends individual POST request for each person, and as each response is returned the page updates live
 
app.post('/allusers', function(req, res) {
users = req.body.massadd.split("\r\n");
console.log(users);
var errorLog = "";
  var counter = users.length;
  for (key in users) {
    var user = users[key].replace(/ /g,'');
    console.log(user);
    (function(u) {
	  bcrypt.genSalt(10, function(err, salt) {
	  	var pw = randomPassword();
	  	
	  		bcrypt.hash(pw, salt, function(err, hash) {
		      console.log("ATTEMPTING TO CREATE USER FOR: " + u);
		      model.createUser(u, hash, pw, function(error, result) {
		        errorLog += error;
		        counter --;
		        if (counter <= 0) {
		          renderComplete();
		        }
		        
		      });
		    });
		  });
	  })(user);

    
  }
/*
  bcrypt.genSalt(10, function(err, salt) {
  	pw = randomPassword();
    bcrypt.hash(pw, salt, function(err, hash) {
      model.createUser(req.body.kerberos,
                          hash, pw);
      res.render('base.html');
    });
  });
  */
  // TODO: duplicate code, refactor
  var renderComplete = function(){
	  if (req.user !== undefined) {
	    var id = req.user.id;
	    console.log(id);
	    
	    model.listUsers(id, function(error, result) {
	      registerContent('allusers');
	      model.getPermissions(req.user.id, function(permissions) {
	      	res.render('base.html', {user: req.user, result: result, permissions: permissions, error: errorLog});
	      });
	    });
	  } else {
	    res.redirect('/login');
	  }
  }
});

app.get('/minutes', function(req, res) {
  if (req.user !== undefined) {
    if (req.query.minute) {
      res.sendfile('minutes/' + req.query.minute);
    } else {
      registerContent('minutes');
      model.getFiles(function(error, files) {
        model.getPermissions(req.user.id, function(permissions) {
          res.render('base.html', {user: req.user, permissions: permissions, files: files});
        });
      });
    }
  } else {
    res.redirect('/login');
  }
});

app.post('/minutes', function(req, res) {
  if (req.user !== undefined) {
    registerContent('minutes');
    var error = '';
    model.getPermissions(req.user.id, function(permissions) {
      if (!permissions.EDITMINUTES) {
        error = 'Invalid permissions.';
      } else if (!req.files || req.files.minute.size == 0) {
        error = 'No file chosen.';
      } else if (req.files.minute.size > 10000000) {
        error = 'Maximum file size is 10 MB';
      }
      if (error) {
        model.getFiles(function(error, files) {
          res.render('base.html', {user: req.user,
            permissions: permissions,
            files: files,
            error: error});
        });
      } else {
        console.log('Uploading file ' + req.files.minute.name);
        fs.readFile(req.files.minute.path, function(err, data) {
          var dest = "minutes/" + req.files.minute.name;
          model.addFile(req.files.minute.name, req.body.date, function(error) {
            fs.writeFile(dest, data, function(err) {
              model.getFiles(function(error, files) {
                res.render('base.html', {user: req.user,
                  permissions: permissions,
                  files: files,
                  success: 'File successfully uploaded'});
              });
            });
          });
        });
      }
    });
  } else {
    res.redirect('/login');
  }
});

app.get('/minutesdel', function(req, res) {
  if (req.user !== undefined) {
    model.getPermissions(req.user.id, function(permissions) {
      if (!permissions.EDITMINUTES) {
        model.getFiles(function(error, files) {
          console.log('files: ' + files);
          res.render('base.html', {user: req.user,
            permissions: permissions,
            files: files,
            error: 'Invalid permissions.'});
        });
      } else if (req.query.minute) {
        model.removeFile(req.query.minute, function(error) {
          model.getFiles(function(error, files) {
            console.log('files: ' + files);
            res.render('base.html', {user: req.user,
              permissions: permissions,
              files: files,
              success: 'File successfully removed'});
          });
        });
      } else {
      	res.redirect('/minutes');
      }
    });
  } else {
      res.redirect('/login');
  }
});


app.get('/users', user.list);

app.get('/emaillists', function(req, res) {
  if (req.user !== undefined) {
	registerContent('emaillists');
    model.getPermissions(req.user.id, function(permissions) {
      res.render('base.html', {'user': req.user, 'permissions': permissions});
    });
  } else {
  	res.render('login.html');
  }
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
