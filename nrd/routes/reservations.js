var async = require('async');
var util = require('./util');
var Users = require('../models/user').Users;
var pm = require('../models/permissions').Permissions;
var Reservations = require('../models/reservations').Reservations;
var logger = require('../models/logger');

var signatoryField = Reservations.signatoryField;
const MAX_NUM_RESERVATIONS = 3;

function complete(req, res, success, err, prevParams) {
  Reservations.getReservationsWithUser(new Date(), req.user,
      function(err2, userReservations) {
        util.render(res, 'roomreservations', {
          user: req.user,
        userReservations: userReservations,
        success: success,
        error: err || err2,
        prevParams: prevParams
        });
      });
}
exports.list = function(req, res) {
  complete(req, res);
};

// Ensure reservation has sufficient signatories that are not duplicate/invalid
var validateReservation = function(reservation, user, callback) {
  reservation.signatory1 = user.kerberos;

  // Check for duplicates
  for (var i = 1; i <= Reservations.MAX_NUM_SIGNATORIES; i++) {
    if (reservation[signatoryField(i)]) {
      for (var j = i + 1; j <= Reservations.MAX_NUM_SIGNATORIES; j++) {
        if (reservation[signatoryField(i)] === reservation[signatoryField(j)]) {
          callback('Duplicate signatory: ' + reservation[signatoryField(i)]);
          return;
        }
      }
    }
  }
  var kerberosList = [];
  for (var i = 2; i <= Reservations.MAX_NUM_SIGNATORIES; i++) {
    if (reservation[signatoryField(i)]) {
      kerberosList.push(reservation[signatoryField(i)]);
    }
  }
  // IAP ONLY: Check country kitchen not reserved in illegal hours
  if (reservation.room == 'Country Kitchen') {
    e = reservation.end.split(':');
    e = parseInt(e[0]) + parseInt(e[1])/60 + reservation.end.endsWith('pm')*12;
    if (e==12 || e>17) { //midnight or past 17:00
      callback("Can't reserve Country Kitchen past 5pm.");
    }
  }
  // Check for sufficient number of signatories
  if (reservation.people === '0') {  // < 10 people
    if (kerberosList.length < 1) {
      callback('Need 2 signatories');
      return;
    }
  } else if (reservation.people === '1') {  // >= 10 people
    if (kerberosList.length < 2) {
      callback('Need 3 signatories');
      return;
    }
  } else {
    callback('Invalid parameter: number of people');
    return;
  }
  // Validate signatories
  Reservations.getReservationsWithUser(new Date(), user,
      function(err, userReservations) {
        if (err) {
          callback(err);
        } else if (!pm.getPermissions(user.group)['EDIT_RESERVATIONS'] &&
          userReservations.length > MAX_NUM_RESERVATIONS) {
            callback('You can have at most ' + MAX_NUM_RESERVATIONS +
              ' outstanding reservations at a time.');
        } else {
          async.filter(kerberosList, function(kerberos, done) {
            Users.findByKerberos(kerberos, function(err, user) {
              // Valid signatories must be users on the NextRes system
              done(err || !user);
            });
          }, function(invalidKerberos) {
              callback(invalidKerberos && invalidKerberos.length > 0 ?
                  'The following signatories are invalid: ' +
                  invalidKerberos.join(', ') : '');
          });
        }
  });
}

var reserve = function(req, res) {
  validateReservation(req.body, req.user, function(err) {
    if (err) {
      complete(req, res, null, err, req.body);
      return;
    }
    Reservations.reserve(req.body, function(err) {
      complete(req, res, 'Room successfully reserved',
        err, err ? req.body : null);
    });
  });
};

// req.body = reservation params, see documentation of Reservations.reserve()
exports.add = reserve;

// req.params = {id: [event ID]}
exports.view = function(req, res) {
  Reservations.getReservation(req.params.id, function(err, reservation) {
    if (err) {
      complete(req, res, null, 'Reservation not found.');
      return;
    }
    reservation.getParams(function(err, params) {
      // Hack: need to swap user.kerberos into signatory1 slot.
      for (var i = 1; i <= Reservations.MAX_NUM_SIGNATORIES; i++) {
        if (params[signatoryField(i)] == req.user.kerberos) {
          params[signatoryField(i)] = params[signatoryField(1)];
          params[signatoryField(1)] = req.user.kerberos;
        }
      }
      complete(req, res, 'Editing reservation.', null, params);
    });
  });
};

// req.params = {id: [event ID]}
exports.edit = function(req, res) {
  // Edit a previous reservation with the given ID.
  Reservations.getReservation(req.params.id, function(err, reservation) {
    if (err) {
      complete(req, res, null, err);
      return;
    }
    reservation.remove(function(err) {  // first remove this reservation
      reserve(req, res);
    });
  });
};

// req.body = {id: [event ID]}
exports.confirm = function(req, res) {
  Reservations.getReservation(req.body.id, function(err, reservation) {
    reservation.confirm(function(err) {
      res.json({'okay': !err});
    });
  });
};

// req.body = {id: [event ID], reason: 'Silly reservation'}
exports.deny = function(req, res) {
  Reservations.getReservation(req.body.id, function(err, reservation) {
    reservation.deny(req.body.reason, function(err) {
      res.json({'okay': !err});
    });
  });
};

// req.body = {id: [event ID]}
exports.remove = function(req, res) {
  Reservations.getReservation(req.body.id, function(err, reservation) {
    reservation.remove(function(err) {
      res.json({'okay': !err});
    });
  });
};

exports.manage = function(req, res) {
  Reservations.getReservations(new Date(), function(err, reservations) {
    util.render(res, 'managereservations', {
      user: req.user,
      reservations: reservations
    });
  });
};
