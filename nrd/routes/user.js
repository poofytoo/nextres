var bcrypt = require('bcrypt');

var util = require('./util');
var Model = require('../models/model');
var model = new Model();

/*
 * GET users listing.
 */

exports.listall = function(req, res){
  res.send("respond with a resource");
};

exports.list = function(req, res) {
  if (req.user !== undefined) {
    var id = req.user.id;
    console.log(id);
    
    model.listUsers(id, function(error, result) {
      util.registerContent('allusers');
      model.getPermissions(req.user.id, function(permissions) {
        res.render('base.html', {user: req.user, result: result, permissions: permissions});
      });
    });
  } else {
    res.redirect('/login');
  }
}

exports.editall = function(req, res) {
  users = req.body.massadd.split("\r\n");
  console.log(users);
  var errorLog = "";
  var counter = users.length;
  for (key in users) {
    var user = users[key].replace(/ /g,'');
    console.log(user);
    (function(u) {
    bcrypt.genSalt(10, function(err, salt) {
      var pw = util.randomPassword();
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

  // TODO: duplicate code, refactor
  var renderComplete = function(){
    if (req.user !== undefined) {
      var id = req.user.id;
      console.log(id);
      
      model.listUsers(id, function(error, result) {
        util.registerContent('allusers');
        model.getPermissions(req.user.id, function(permissions) {
          res.render('base.html', {user: req.user, result: result, permissions: permissions, error: errorLog});
        });
      });
    } else {
      res.redirect('/login');
    }
  }
}

exports.login = function(req, res) {
  if (req.user !== undefined) {
    res.redirect('/manage');
  } else {
    res.render('login.html');
  }
}

exports.logout = function(req, res) {
  req.session.regenerate(function() {
    req.logout();
    util.registerContent('home');
    res.redirect('/');
  });
}

exports.remove = function(req, res) {
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
}

//TODO: fix this to actually use FailureFlash
exports.loginfail = function(req, res) {
  res.render('login.html', {'error': true});
}

exports.loginsuccess = function(req, res) {
  if (req.user.id) {
  // If this function gets called, authentication was successful.
  // `req.user` contains the authenticated user.
    console.log('login success: ' + req.user.username);
    util.registerContent('home');
    model.getPermissions(req.user.id, function(permissions) {
      res.render('base.html', {'user': req.user, 'permissions': permissions});
    });
  }
}

// this is probably very unsecure..
exports.passwordreset = function(req, res) {
  console.log(req.body);
  if (req.user !== undefined) {
      kerberos = req.body.kerberos;
      model.getKerberos (kerberos, function(error, result) {
        console.log(result);
        if (result!==undefined) {
        id = result['id'];
        var newPassword = util.randomPassword();
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
}

exports.viewinfo = function(req, res) {
  if (req.user !== undefined) {
    
    model.getUser(req.user.id, function(error, result) {
      var info = result;
      util.registerContent('residentinfo');
      console.log(info);
      model.getPermissions(req.user.id, function(permissions) {
        res.render('base.html', {'user': req.user, 'permissions': permissions, 'info': info});
      });
    });
  } else {
    res.redirect('/login');
  }
}

exports.editinfo = function(req, res) {
  if (req.user !== undefined) {
    info = {};
    info.firstName = req.body.firstname;
    info.lastName = req.body.lastname;
    info.roomNumber = req.body.roomnumber;
    
    model.updateUser(req.user.id, info, function(error, result) {
      model.getUser(req.user.id, function(error, result) {
        var info = result;
        util.registerContent('residentinfo');
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
}

exports.viewpassword = function(req, res) {
  if (req.user !== undefined) {
    var id = req.user.id;
    console.log(id);
    
    util.registerContent('changepassword');
    model.getPermissions(req.user.id, function(permissions) {
      res.render('base.html', {'user': req.user, 'permissions': permissions});
    });
  } else {
    res.redirect('/login');
  }
}

exports.editpassword = function(req, res) {
  if (req.user !== undefined) {
    var id = req.user.id;
    var oldPassword = req.body.oldpassword;
    var newPassword = req.body.newpassword;

    model.login(req.user.kerberos, function(error, result) {
      if (result !== undefined) {
        bcrypt.compare(oldPassword, result.password, function(err, authenticated) {
          if (!authenticated) {
            util.registerContent('changepassword');
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
                  util.registerContent('changepassword');
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
  } else {
    res.redirect('/login');
  }
}

exports.emaillists = function(req, res) {
  if (req.user !== undefined) {
    util.registerContent('emaillists');
    model.getPermissions(req.user.id, function(permissions) {
      res.render('base.html', {'user': req.user, 'permissions': permissions});
    });
  } else {
    res.render('login.html');
  }
}