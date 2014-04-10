var util = require('./util');
var Users = require('../models/user').Users;
var logger = require('../models/logger');

var complete = function(req, res, err) {
  Users.getAllUsers({}, function(err2, users) {
    util.render(res, 'allusers', {
      user: req.user,
      users: users,
      error: err || err2
    });
  });
}

exports.login = function(req, res) {
  res.render('login.html', {error: req.flash('error')});
}

exports.loginsuccess = function(req, res) {
  if (req.session.returnTo) {
    res.redirect(req.session.returnTo);
    req.session.returnTo = false;
  } else {
    res.redirect('/');
  }
}

exports.logout = function(req, res) {
  req.session.regenerate(function() {
    req.logout();
    res.redirect('/login');
  });
}

exports.list = function(req, res) {
  complete(req, res);
}

// req.body = {kerberos: 'kyc2915'}
exports.add = function(req, res) {
  Users.createUser(req.body.kerberos, function(err) {
    complete(req, res, err);
  });
}

// req.body = {kerberosList: 'kyc2915\nvhung'}
exports.massadd = function(req, res) {
  var kerberosList = req.body.kerberosList.split("\r\n");
  Users.createUsers(kerberosList, function(err) {
    complete(req, res, err);
  });
}

// req.body = {kerberos: 'kyc2915'}
exports.remove = function(req, res) {
  Users.getUserWithKerberos(req.body.kerberos, function(err, user) {
    if (user) {
      user.remove(function() {});
    }
    res.end();
  });
}

exports.viewprofile = function(req, res) {
  util.render(res, 'profile', {user: req.user});
}

// req.body = {firstname: 'Kevin', 'lastname': 'Chen', 'roomnumber': 310}
exports.editprofile = function(req, res) {
  util.sanitize(req.body, 'firstname', /[^A-Za-z0-9\-_ ]/g, 15);
  util.sanitize(req.body, 'lastname', /[^A-Za-z0-9\-_ ]/g, 15);
  util.sanitize(req.body, 'roomnumber', /[^0-9]/g, 3);
  req.user.updateProfile(req.body.firstname,
      req.body.lastname, req.body.roomnumber, function(err) {
        Users.getUser(req.user.id, function(err2, user) {
          util.render(res, 'profile', {
            user: user,
            success: 'Your residence info has been updated.',
            error: err || err2
          });
        });
      });
}

exports.viewpassword = function(req, res) {
  util.render(res, 'changepassword', {user: req.user});
}

// req.body = {oldpassword: 'password': newpassword: 's+r0Ng3r'}
exports.editpassword = function(req, res) {
  var complete = function(err) {
    util.render(res, 'changepassword', {
      user: req.user,
      success: 'Your password has been changed!',
      error: err
    });
  };
  req.user.authenticate(req.body.oldpassword, function(err, authenticated) {
    if (err || !authenticated) {
      complete(err || 'Your current password is incorrect!');
    } else {
      req.user.changePassword(req.body.newpassword, function(err) {
        complete(err);
      });
    }
  });
}

// req.body = {kerberos: 'kyc2915'}
exports.resetpassword = function(req, res) {
  Users.getUserWithKerberos(req.body.kerberos, function(err, user) {
    if (user) {
      user.resetPassword(function() {});
    }
  });
}

// req.body = {kerberos: 'kyc2915', permission: 1}
exports.changepermission = function(req, res) {
  // TODO enforce permissions here
  Users.getUserWithKerberos(req.body.kerberos, function(err, user) {
    if (user) {
      user.changeGroup(req.body.permission, function() {});
    }
  });
}

// req.body = {mitID: 12345}
// returns res.json({error: 'error'})
// or returns res.json(User object)
exports.findmitid = function(req, res) {
  Users.getUserWithMitID(req.body.mitID, function(err, user) {
    if (err) {
      res.json({error: err});
    } else {
      res.json(user);
    }
  });
}

// req.body = {kerberosSearchPattern: 'kyc', limit: 5}
// returns res.json([User object, User object])
exports.searchkerberos = function(req, res) {
  Users.getAllUsers({
    kerberosSearchPattern: req.body.kerberosSearchPattern,
    limit: req.body.limit
  }, function(err, users) {
    if (err) {
      res.json({error: err});
    } else {
      // sanitize the User object
      for (var i = 0; i < users.length; i++) {
        delete users[i].id;
        delete users[i].mitID;
        delete users[i].password;
      }
      res.json(users);
    }
  });
}

// req.body = {kerberos: 'kyc2915', mitID: 12345}
// saves the mitID to the User with the given kerberos
exports.savekerberos = function(req, res) {
  Users.getUserWithKerberos(req.body.kerberos, function(err, user) {
    if (err) {
      res.json({error: err});
    } else {
      user.editMitID(req.body.mitID, function(err) {
        res.json({error: err});
      });
    }
  });
}
