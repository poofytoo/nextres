var util = require('./util');
var Model = require('../models/model');

var model = new Model();

// TODO(styu) refactor these functions


// END TODO

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
    registerContent('home');
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