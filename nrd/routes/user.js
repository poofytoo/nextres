var bcrypt = require('bcrypt');

var util = require('./util');
var User = require('../models/user');
var userModel = new User();
var Model = require('../models/model');
var model = new Model();
var logger = require('../models/logger');

/*
 * GET users listing.
 */

exports.listall = function(req, res){
  res.send("respond with a resource");
};

exports.list = function(req, res) {
  if (req.user !== undefined) {
    var id = req.user.id;
    logger.info(id);
    
    userModel.listUsers(id, function(error, result, allroles) {
      util.registerContent('allusers');
      model.getPermissions(req.user.id, function(permissions) {
        
        // very inefficient way of determining which roles the user can be changed to
        for (i in result){
          user = result[i];
          if (permissions.FULLPERMISSIONSCONTROL) {
            // has full permission control - allow all roles
          	result[i].possibleRoles = allroles.slice(0);
          	result[i].possibleRoles.unshift({id: user.group, name: user.name});
          } else if (permissions.MAKEUSERSNEXTEXEC) {
            // allow changing users to next exec, desk worker, or desk captain
            if (user.group != 1){
              result[i].possibleRoles = [];
        	    result[i].possibleRoles.push({id: 0, name:'USER'});
        	    result[i].possibleRoles.push({id: 1, name:'NEXTEXEC'});
        	    result[i].possibleRoles.push({id: 2, name:'DESKWORKER'});
        	    result[i].possibleRoles.push({id: 3, name:'DESKCAPTAIN'});
          	  result[i].possibleRoles.unshift({id: user.group, name: user.name});
        	  }
          } else if (permissions.MAKEUSERSDESKWORKERS) {
            // allow changing users to desk worker
            if (user.group != 1 && user.group != 3){
              result[i].possibleRoles = [];
        	    result[i].possibleRoles.push({id: 0, name:'USER'});
        	    result[i].possibleRoles.push({id: 2, name:'DESKWORKER'});
        	    result[i].possibleRoles.push({id: 3, name:'DESKCAPTAIN'});
          	  result[i].possibleRoles.unshift({id: user.group, name: user.name});
        	  }
          }
        }
        
        res.render('base.html', {user: req.user, 
        					               result: result, 
        					               permissions: permissions});
      });
    });
  } else {
    res.redirect('/login');
  }
}

exports.editall = function(req, res) {
  users = req.body.massadd.split("\r\n");
  logger.info(users);
  var errorLog = "";
  var counter = users.length;
  for (key in users) {
    var user = users[key].replace(/ /g,'');
    logger.info(user);
    (function(u) {
    bcrypt.genSalt(10, function(err, salt) {
      var pw = util.randomPassword();
        bcrypt.hash(pw, salt, function(err, hash) {
          logger.info("ATTEMPTING TO CREATE USER FOR: " + u);
          userModel.createUser(u, hash, pw, function(error, result) {
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
      logger.info(id);
      
      userModel.listUsers(id, function(error, result) {
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
  logger.info(req.body);
  if (req.user !== undefined) {
    userModel.removeUser(req.body.kerberos, function (error) {
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
    logger.info('login success: ' + req.user.username);
    util.registerContent('home');
    model.getPermissions(req.user.id, function(permissions) {
      res.render('base.html', {'user': req.user, 'permissions': permissions});
    });
  }
}

// this is probably very unsecure..
exports.passwordreset = function(req, res) {
  logger.info(req.body);
  if (req.user !== undefined) {
      kerberos = req.body.kerberos;
      userModel.getKerberos (kerberos, function(error, result) {
        logger.info(result);
        if (result!==undefined) {
        id = result['id'];
        var newPassword = util.randomPassword();
        logger.info(newPassword);
        bcrypt.genSalt(10, function(err, salt) {
              bcrypt.hash(newPassword, salt, function(err, hash) {
                userModel.resetPassword(id, hash, newPassword, kerberos, function(error, result) {});
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
    userModel.getUser(req.user.id, function(error, result) {
      var info = result;
      util.registerContent('residentinfo');
      logger.info(JSON.stringify(info));
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
    
    userModel.updateUser(req.user.id, info, function(error, result) {
      userModel.getUser(req.user.id, function(error, result) {
        var info = result;
        util.registerContent('residentinfo');
        logger.info(JSON.stringify(info));
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
    logger.info(id);
    
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

    userModel.login(req.user.kerberos, function(error, result) {
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
            logger.info('correct password');
            bcrypt.genSalt(10, function(err, salt) {
              bcrypt.hash(newPassword, salt, function(err, hash) {
                userModel.changePassword(id, hash, function(error, result) {
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
