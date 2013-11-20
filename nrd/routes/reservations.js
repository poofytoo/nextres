var util = require('./util');
var Model = require('../models/model');
var model = new Model();
var Reservation = require('../models/reservations');
var reservationModel = new Reservation();
var logger = require('../models/logger');

exports.view = function(req, res) {
  if (req.user !== undefined) {
    util.registerContent('roomreservations');
    reservationModel.getEventsWithUser(req.user, function(userEvents, allEvents) {
      res.render('base.html', {
        user: req.user,
        permissions: req.permissions,
        userEvents: userEvents,
        allEvents: allEvents
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
  } else {
    res.redirect('/login');
  }
};

exports.delete = function(req, res) {
  if (req.user !== undefined) {
    reservationModel.removeReservation(req.user, req.body.id, function(err) {
      res.json({'okay': !err});
    });
  } else {
    res.redirect('/login');
  }
};

exports.confirm = function(req, res) {
  if (req.user !== undefined) {
    if (req.permissions.EDITRESERVATIONS) {
      reservationModel.confirmReservation(req.user, req.body.id, function(err) {
        res.json({'okay': !err});
      });
    } else {
      res.send(400, 'Invalid permissions to edit reservations.');
    }
  } else {
    res.redirect('/login');
  }
};

exports.deny = function(req, res) {
  if (req.user !== undefined) {
    reservationModel.denyReservation(req.user, req.body.id, req.body.reason, function(err) {
      res.json({'okay': !err});
    });
  } else {
    res.redirect('/login');
  }
};

exports.manage =  function(req, res) {
  if (req.user !== undefined) {
    util.registerContent('managereservations');
    reservationModel.getEventsWithUser(req.user, function(userEvents, allEvents) {
      res.render('base.html', {
        user: req.user,
        permissions: req.permissions,
        userEvents: userEvents,
        allEvents: allEvents
      });
    });
  } else {
    res.redirect('/login');
  }
}

