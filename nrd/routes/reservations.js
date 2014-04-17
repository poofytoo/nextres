var util = require('./util');
var Users = require('../models/user').Users;
var pm = require('../models/permissions').Permissions;
var Reservations = require('../models/reservations').Reservations;
var logger = require('../models/logger');

var signatoryField = Reservations.signatoryField;
const MAX_NUM_RESERVATIONS = 3;

function complete(req, res, success, err) {
  Reservations.getReservationsWithUser(new Date(), req.user,
      function(err2, userReservations) {
        util.render(res, 'roomreservations', {
          user: req.user,
        userReservations: userReservations,
        success: success,
        error: err || err2
        });
      });
};

exports.list = function(req, res) {
  complete(req, res);
}

exports.edit = function(req, res) {
  reservationModel.reserve(req.user, req.body, req.permissions, function(result) {
    util.registerContent('roomreservations');
    reservationModel.getEventsWithUser(req.user, function(userEvents) {
      res.render('base.html', {
        user: req.user,
        permissions: req.permissions,
        success: result.success,
        error: result.error,
        userEvents: userEvents
      });
    });
  });
};

// Ensure reservation has sufficient signatories that are not duplicate/invalid
function validateReservation(reservation, user, callback) {
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
    kerberosList.push(reservation[signatoryField(i)]);
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
          Users.validateKerberosList(kerberosList,
            function(err, invalidKerberos) {
              callback(err || (invalidKerberos.length > 0 ?
                  'The following signatories are invalid: ' +
                  invalidKerberos.join(', ') : ''));
            });
        }
  });
}

// req.body = reservation params, see documentation of Reservations.reserve()
exports.add = function(req, res) {
  req.body.signatory1 = req.user.kerberos;
  validateReservation(req.body, req.user, function(err) {
    if (err) {
      complete(req, res, null, err);
      return;
    }
    Reservations.reserve(req.body, function(err) {
      complete(req, res, 'Room successfully reserved', err);
    });
  });
}

// req.body = {id: [event ID]}
exports.confirm = function(req, res) {
  Reservations.getReservation(req.body.id, function(err, reservation) {
    reservation.confirm(function(err) {
      res.json({'okay': !err});
    });
  });
}

// req.body = {id: [event ID], reason: 'Silly reservation'}
exports.deny = function(req, res) {
  Reservations.getReservation(req.body.id, function(err, reservation) {
    reservation.deny(req.body.reason, function(err) {
      res.json({'okay': !err});
    });
  });
}

// req.body = {id: [event ID]}
exports.remove = function(req, res) {
  Reservations.getReservation(req.body.id, function(err, reservation) {
    reservation.remove(function(err) {
      res.json({'okay': !err});
    });
  });
}

exports.manage = function(req, res) {
  Reservations.getReservations(new Date(), function(err, reservations) {
    util.render(res, 'managereservations', {
      user: req.user,
      reservations: reservations
    });
  });
}

