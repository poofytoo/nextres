var async = require('async');
var util = require('./util');
var Users = require('../models/user').Users;
var GuestLists = require('../models/guestlist').GuestLists;
var logger = require('../models/logger');

var nameField = GuestLists.nameField;
var kerberosField = GuestLists.kerberosField;

function complete(req, res, success, error, warnings) {
  GuestLists.findByUserId(req.user.id, function(err, guestlist) {
    if (guestlist) {
      guestlist = GuestLists.guestListToObj(guestlist);
    }
    util.render(res, 'guestlist', {
      user: req.user,
      guests: guestlist,
      success: success,
      warnings: warnings,
      error: error || err
    });
  });
}

function completeManage(req, res, success, error, warnings) {
  util.render(res, 'manageguestlists', {
    user: req.user,
    success: success,
    warnings: warnings,
    error: error
  });
}

exports.list = function(req, res) {
  GuestLists.listGuests({}, function(err, guestlists) {
    if (guestlists) {
      guestlists = guestlists.map(GuestLists.guestListToObj);
    }
    util.render(res, 'allguests', {
      user: req.user,
      guestlists: guestlists,
      error: err
    });
  });
};

// req.query = {hostSearchPattern: 'kyc', sortBy: 'kerberos'}
//   or {guestSearchPattern: 'cky', sortBy: 'firstName'}
exports.search = function(req, res) {
  GuestLists.listGuests(req.query, function(err, guestlists) {
    if (guestlists) {
      guestlists = guestlists.map(GuestLists.guestListToObj);
    }
    res.json(guestlists);
  });
};

exports.view = function(req, res) {
  complete(req, res);
};

function validateGuestlist(guestlist, callback) {
  var kerberosList = [];
  for (var i = 1; i <= GuestLists.MAX_NUM_GUESTS; i++) {
    kerberosList.push(guestlist[kerberosField(i)]);
  }

  // Find invalid kerberos.
  async.filter(kerberosList, function(kerberos, done) {
    if (kerberos === '' || kerberos === null) {
      done(false);  // empty guest fields are not invalid
      return;
    }
    Users.getProfile(kerberos, function(err, profile) {
      // Valid guests have a year (1, 2, 3, 4 or G)
      if (err) {
        done(true)
      } else if (profile) {
        done(!profile.year || profile.year == 'G');
      } else {
        done(false)
      }
    });
  }, function(invalidKerberos) {
    callback(invalidKerberos && invalidKerberos.length > 0 ?
        'The following guest kerberos are invalid: ' +
        invalidKerberos.join(', ') : '');
  });
}


// req.body = {guest1Name: 'Becky Shi', guest1Kerberos: 'beckyshi'}
exports.edit = function(req, res) {
  for (var i = 1; i <= GuestLists.MAX_NUM_GUESTS; i++) {
    util.sanitize(req.body, nameField(i), /[^A-Za-z0-9\-\_ ]/g, 30);
    util.sanitize(req.body, kerberosField(i), /[^A-Za-z0-9\-\_ ]/g, 8);
  }
  validateGuestlist(req.body, function(err) {
    if (err) {
      complete(req, res, null, err);
      return;
    }
    GuestLists.findByUserId(req.user.id, function(err, guestlist) {
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
};

// req.query = {hostKerberos: 'rliu42'}
exports.manage = function(req, res) {
  if (req.query.hostKerberos) {
    util.sanitize(req.query, 'hostKerberos', /[^A-Za-z0-9\-\_ ]/g, 8);
    Users.findByKerberos(req.query.hostKerberos, function(err, user) {
      if (err) {
        complete(req, res, null, err);
      } else {
        GuestLists.findByUserId(user.id, function(err2, guestlist) {
          if (err2) {
            complete(req, res, null, err2);
          } else {
            if (guestlist) {
              guestlist = GuestLists.guestListToObj(guestlist);
            }
            util.render(res, 'manageguestlists', {
              user: req.user,
              host: req.query.hostKerberos,
              guests: guestlist
            });
          }
        });
      }
    });
  } else {
    util.render(res, 'manageguestlists', {
      user: req.user
    });
  }
};

// req.body = {hostKerberos: 'rliu42', guest1Name: 'Becky Shi', guest1Kerberos: 'beckyshi'}
exports.editother = function(req, res) {
  util.sanitize(req.body, 'hostKerberos', /[^A-Za-z0-9\-\_ ]/g, 8);
  for (var i = 1; i <= GuestLists.MAX_NUM_GUESTS; i++) {
    util.sanitize(req.body, nameField(i), /[^A-Za-z0-9\-\_ ]/g, 30);
    util.sanitize(req.body, kerberosField(i), /[^A-Za-z0-9\-\_ ]/g, 8);
  }
  Users.findByKerberos(req.body.hostKerberos, function(err, user) {
    if (err) {
      completeManage(req, res, null, err);
    } else {
      GuestLists.findByUserId(user.id, function(err2, guestlist) {
        if (err2) {
          completeManage(req, res, null, err);
        } else {
          GuestLists.findRepeatedGuests(req.body, user,
            function(err3, repeatedGuests) {
              var warnings = [];
              if (!err3) {
                for (var i = 0; i < repeatedGuests.length; i++) {
                  warnings.push('Note: ' + repeatedGuests[i].guest +
                    ' is already on the guestlist of ' +
                    repeatedGuests[i].host.firstName + ' ' +
                    repeatedGuests[i].host.lastName);
                }
              }
              guestlist.updateGuests(req.body, function(err4) {
                completeManage(req, res, req.body.hostKerberos + '\'s guest list has been updated.',
                  err4, warnings);
              });
            });
        }
      });
    }
  });
};

