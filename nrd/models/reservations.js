/*
Instructions for Reservation System with Google Calendar API

The google-oauth-serviceaccount module reads from a file oauth-config.json which should be in the same directory. This in turn reads from the private key.pem file that should also be in the same directory.

DO NOT COMMIT key.pem!
*/

var request = require('request');
var gaccount = require('google-oauth-serviceaccount');
var qs = require('qs');
var df = require('./dateformat');

const calRoot = "https://www.googleapis.com/calendar/v3/";
const calID = "87a94e6q5l0nb6bfphe3192uv8@group.calendar.google.com";
const MAX_DAYS = 60;  // number of days in the future that room can be reserved

function toRFC3339(date, time) {
  // New York time zone is -04:00
  // TODO does this still work when daylight savings comes along?
  if (time) {
    return df.dateFormat(date, "yyyy-mm-dd") + 'T' + time + ':00.000-04:00';
  } else {
    return df.dateFormat(date, "yyyy-mm-dd'T'HH:MM") + ':00.000-04:00';
  }
}

function listEvents(access_token, timeMin, timeMax, callback) {
  var listURL = calRoot + "calendars/" + calID + "/events?" +
    qs.stringify({
      'access_token': access_token,
      'timeMin': timeMin,
      'timeMax': timeMax
    });
  request.get({
    url: listURL,
    json: true
  }, callback);
}

function insertEvent(user, access_token, params, callback) {
  var postURL = calRoot + "calendars/" + calID + "/events?access_token=" + access_token;
  request.post({
    url: postURL,
    body: {
      'summary': params.room + " - " + user.kerberos,
      'location': params.room,
      'description': params.reason,
      'start': { 'dateTime': toRFC3339(params.date, params.start) },
      'end': { 'dateTime': toRFC3339(params.date, params.end) },
      'status': 'tentative',  // until exec confirms or denies
      'attendees': [ { 'email': user.kerberos + '@mit.edu' } ],
      'visibility': 'public'
    },
    json: true
  }, callback);
}

function removeEvent(access_token, id, callback) {
  var delURL = calRoot + "calendars/" + calID + "/events/" + id + "?access_token=" + access_token;
  request.del({
    url: delURL,
    json: true
  }, callback);
}

exports.getEventsWithUser = function(user, callback) {
  gaccount.auth(function(err, access_token) {
    var now = new Date(); var timeMin = toRFC3339(now);
    now.setDate(now.getDate() + MAX_DAYS); var timeMax = toRFC3339(now);
    listEvents(access_token, timeMin, timeMax, function(err, res, body) {
      var userEvents = [];
      if (body.items) {
        for (var i = 0; i < body.items.length; i++) {
          var creator = body.items[i].attendees[0];
          if (creator && creator.email === user.kerberos + '@mit.edu') {
            userEvents.push(body.items[i]);
          }
        }
      }
      callback(userEvents);
    });
  });
}

exports.reserve = function(user, params, callback) {
  gaccount.auth(function(err, access_token) {
    var timeMin = toRFC3339(params.date, params.start);
    var timeMax = toRFC3339(params.date, params.end);
    listEvents(access_token, timeMin, timeMax, function(err, res, body) {
      /* Forbid conflicts */
      if (body.items) {
        for (var i = 0; i < body.items.length; i++) {
          if (body.items[i].location === params.room) {
            callback({'error': 'Reservation conflict'});
            return;
          }
        }
      }
      /* Update Google Calendar */
      insertEvent(user, access_token, params, function(err, res, body) {
        callback({'success': 'Room successfully reserved'});
      });
    });
  });
};

exports.removeReservation = function(id, callback) {
  gaccount.auth(function (err, access_token) {
    removeEvent(access_token, id, function(err, res, body) {
      callback(err);
    });
  });
}
