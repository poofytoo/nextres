var util = require('./util');
var Model = require('../models/model');
var model = new Model();
var GuestList = require('../models/guestlist');
var guestlistModel = new GuestList();
var logger = require('../models/logger');

exports.view = function(req, res) {
  if (req.user !== undefined) {
    logger.info(req.user.id);
    guestlistModel.getGuests(req.user.id, function(error, result) {
      guests =[]
      for (var i = 1; i <= 3; i++) {
        info = {name: result['guest' + i + 'Name'],
                kerberos: result['guest' + i + 'Kerberos']};
        guests.push(info);
      }
      util.registerContent('manage');
      res.render('base.html', {'user': req.user,
                               'permissions': req.permissions,
                               'guests': guests});
    });
  } else {
    res.redirect('/login');
  }
}

exports.edit = function(req, res) {
  logger.info(req.user.id);
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
        guestlistModel.addGuests(id, guests, function(error, result) {
          util.registerContent('manage');
          guestlistModel.onGuestList(id, guests, function(onGuestLists) {
            var success = 'Your guest list has been updated.';
            res.render('base.html', {'user': req.user,
              'permissions': req.permissions,
              'guests': guests,
              'success': success,
              'alreadyHere': onGuestLists});
          });
        });
      } else {
        var error = 'Invalid kerberos: ' + invalids.join(', ');
        res.render('base.html', {'user': req.user,
          'permissions': req.permissions,
          'guests': guests,
          'error': error});
      }
    });
  } else {
    res.redirect('/login');
  }
}

exports.list = function(req, res) {
  if (req.user !== undefined) {
    params = {};
    var id = req.user.id;
    logger.info(id);
    guestlistModel.listGuests(id, params, function(error, result) {
      util.registerContent('allguests');
      res.render('base.html', {user: req.user, result: result, permissions: req.permissions});
    });
  } else {
    res.redirect('/login');
  }
}

exports.search = function(req, res) {
  var id = req.user.id;
  guestlistModel.listGuests(id, req.query, function(error, result) {
    if (result !== undefined){
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
}
