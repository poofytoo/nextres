var util = require('./util');
var Model = require('../models/model');
var model = new Model();

exports.view = function(req, res) {
  if (req.user !== undefined) {
    console.log(req.user);
    model.getGuests(req.user.id, function(error, result) {
      guests =[]
      for (var i = 1; i <= 3; i++) {
        info = {name: result['guest' + i + 'Name'],
                kerberos: result['guest' + i + 'Kerberos']};
        guests.push(info);
      }
      util.registerContent('manage');
      model.getPermissions(req.user.id, function(permissions) {
        res.render('base.html', {'user': req.user,
                                 'permissions': permissions,
                                 'guests': guests});
      });
    });
  } else {
    res.redirect('/login');
  }
}

exports.edit = function(req, res) {
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
          util.registerContent('manage');
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
}

exports.list = function(req, res) {
  if (req.user !== undefined) {
    console.log(id);
    params = {};
    var id = req.user.id
    model.listGuests(id, params, function(error, result) {
      console.log(result);
      util.registerContent('allguests');
      model.getPermissions(req.user.id, function(permissions) {
        res.render('base.html', {user: req.user, result: result, permissions: permissions});
      });
    });
  } else {
    res.redirect('/login');
  }
}