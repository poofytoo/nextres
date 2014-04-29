var async = require('async');
var util = require('./util');
var Users = require('../models/user').Users;
var GuestLists = require('../models/guestlist').GuestLists;
var logger = require('../models/logger');

var nameField = GuestLists.nameField;
var kerberosField = GuestLists.kerberosField;

function complete(req, res, success, error, warnings) {
  GuestLists.getGuestListOfUser(req.user.id, function(err, guestlist) {
    util.render(res, 'guestlist', {
      user: req.user,
      guests: guestlist,
      success: success,
      warnings: warnings,
      error: error || err
    });
  });
}

exports.list = function(req, res) {
  GuestLists.listGuests({}, function(err, guestlists) {
    util.render(res, 'allguests', {
      user: req.user,
      guestlists: guestlists,
      error: err
    });
  });
}

// req.query = {hostSearchPattern: 'kyc', sortBy: 'kerberos'}
//   or {guestSearchPattern: 'cky', sortBy: 'firstName'}
exports.search = function(req, res) {
  GuestLists.listGuests(req.query, function(err, guestlists) {
    res.json(guestlists);
  });
}

exports.view = function(req, res) {
  complete(req, res);
}

function validateGuestlist(guestlist, callback) {
  var kerberosList = [];
  for (var i = 1; i <= GuestLists.MAX_NUM_GUESTS; i++) {
    kerberosList.push(guestlist[kerberosField(i)]);
  }

  // Find invalid kerberos.
  async.filter(kerberosList, function(kerberos, done) {
    if (kerberos === '') {
      done(false);  // empty guest fields are not invalid
      return;
    }
    Users.getProfile(kerberos, function(err, profile) {
      // Valid guests have a year (1, 2, 3, 4 or G)
      done(!profile.year);
    });
  }, function(invalidKerberos) {
    callback(invalidKerberos.length > 0 ?
        'The following guest kerberos are invalid: ' +
        invalidKerberos.join(', ') : '');
  });
}


// req.body = {guest1Name: 'Becky Shi', guest1Kerberos: 'beckyshi'}
exports.edit = function(req, res) {
  for (var i = 1; i <= GuestLists.MAX_NUM_GUESTS; i++) {
    util.sanitize(req.body, nameField(i), /[^A-Za-z0-9\-_ ]/g, 30);
    util.sanitize(req.body, kerberosField(i), /[^A-Za-z0-9\-_ ]/g, 8);
  }
  validateGuestlist(req.body, function(err) {
    if (err) {
      complete(req, res, null, err);
      return;
    }
    GuestLists.getGuestListOfUser(req.user.id, function(err, guestlist) {
      if (err) {
        complete(req, res, null, err);
      } else {
        GuestLists.findRepeatedGuests(req.body, req.user,
          function(err, repeatedGuests) {
            var warnings = [];
            if (!err) {
              for (var i = 0; i < repeatedGuests.length; i++) {
                warnings.push('Note: ' + repeatedGuests[i].guest +
                  ' is already on the guestlist of ' +
                  repeatedGuests[i].host.firstName + ' ' +
                  repeatedGuests[i].host.lastName);
              }
            }
            guestlist.updateGuests(req.body, function(err2) {
              complete(req, res, 'Your guest list has been updated.',
                err || err2, warnings);
            });
          });
      }
    });
  });
}
