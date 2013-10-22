var util = require('./util');
var Model = require('../models/model');
var model = new Model();
var Reservation = require('../models/reservations');
var reservationModel = new Reservation();

exports.view = function(req, res) {
  if (req.user !== undefined) {
    util.registerContent('roomreservations');
    model.getPermissions(req.user.id, function(permissions) {
      reservationModel.getEventsWithUser(req.user, function(userEvents, allEvents) {
        res.render('base.html', {
          user: req.user,
          permissions: permissions,
          userEvents: userEvents,
          allEvents: allEvents
        });
      });
    });
  } else {
    res.redirect('/login');
  }
};

exports.edit = function(req, res) {
  if (req.user !== undefined) {
    reservationModel.reserve(req.user, req.body, function(result) {
      util.registerContent('roomreservations');
      model.getPermissions(req.user.id, function(permissions) {
        reservationModel.getEventsWithUser(req.user, function(userEvents) {
          res.render('base.html', {
            user: req.user,
            permissions: permissions,
            success: result.success,
            error: result.error,
            userEvents: userEvents
          });
        });
      });
    });
  } else {
    res.redirect('/login');
  }
};

exports.delete = function(req, res) {
  if (req.user !== undefined) {
    reservationModel.removeReservation(req.body.id, function(err) {
      res.json({'okay': !err});
    });
  } else {
    res.redirect('/login');
  }
};

exports.deny = function(req, res) {
  if (req.user !== undefined) {
    reservationModel.denyReservation(req.body.id, req.body.reason, function(err) {
      res.json({'okay': !err});
    });
  } else {
    res.redirect('/login');
  }
};


