var util = require('./util');
var Model = require('../models/model');
var model = new Model();
var Reservation = require('../models/reservations');
var reservationModel = new Reservation();
var logger = require('../models/logger');

exports.view = function(req, res) {
  util.registerContent('roomreservations');
  reservationModel.getEventsWithUser(req.user, function(userEvents, allEvents) {
    res.render('base.html', {
      user: req.user,
      permissions: req.permissions,
      userEvents: userEvents,
      allEvents: allEvents
    });
  });
};

exports.edit = function(req, res) {
  reservationModel.reserve(req.user, req.body, function(result) {
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

exports.delete = function(req, res) {
  reservationModel.removeReservation(req.user, req.body.id, function(err) {
    res.json({'okay': !err});
  });
};

exports.confirm = function(req, res) {
  if (req.permissions.EDITRESERVATIONS) {
    reservationModel.confirmReservation(req.user, req.body.id, function(err) {
      res.json({'okay': !err});
    });
  } else {
    res.send(400, 'Invalid permissions to edit reservations.');
  }
};

exports.deny = function(req, res) {
  reservationModel.denyReservation(req.user, req.body.id, req.body.reason, function(err) {
    res.json({'okay': !err});
  });
};

exports.manage =  function(req, res) {
  util.registerContent('managereservations');
  reservationModel.getEventsWithUser(req.user, function(userEvents, allEvents) {
    res.render('base.html', {
      user: req.user,
      permissions: req.permissions,
      userEvents: userEvents,
      allEvents: allEvents
    });
  });
}

