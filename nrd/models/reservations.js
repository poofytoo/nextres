/*
Instructions for Reservation System with Google Calendar API

The google-oauth-serviceaccount module reads from a file oauth-config.json which should be in the same directory. This in turn reads from the private key.pem file that should also be in the same directory.

DO NOT COMMIT key.pem!
*/

var request = require('request');
var gaccount = require('google-oauth-serviceaccount');
var qs = require('qs');
var time = require('time');
var validation = require('./validation');
var df = require('./dateformat');
var mailer = require('./mailer');
var User = require('./user');
var userModel = new User();
var logger = require('./logger');

const calRoot = "https://www.googleapis.com/calendar/v3/";
const calID = "87a94e6q5l0nb6bfphe3192uv8@group.calendar.google.com";
const MAX_DAYS = 60;  // number of days in the future that room can be reserved

function Reservation() {
};

function toRFC3339(datetime) {
  var ans =  df.dateFormat(time.Date(datetime, 'America/New_York'),
          "yyyy-mm-dd'T'HH:MM:00.000o");
  return ans;
}

function to24h(time) {
  if (!time.match(/[0-9]:[0-5][0-9][ap]m/) && !time.match(/1[0-2]:[0-5][0-9][ap]m/)) {
    return 'invalid';
  }
  if (time === '12:00am') {
      // Hack - for some reason lots of people want an event to end at midnight,
      // but for Google Calendar reasons it needs to stay on the same day.
      return [23, 59];
  }
  var hours = time.substring(0, time.indexOf(":"));
  var minutes = time.substring(time.indexOf(":") + 1, time.length - 2);
  var suffix = time.substring(time.length - 2);
  if (hours === '12') {
    hours = (suffix === 'am' ? '0' : '12');
  } else if (suffix === 'pm') {
    hours = parseInt(hours) + 12 + '';
  }
  if (hours.length == 1) {
    hours = '0' + hours;
  }
  return [hours, minutes];
}

function formatRFC3339(str) {
  var parts = str.split('T');
  var day = parts[0], time = parts[1].substring(0, 5);
  return time + " on " + day;
}

function getEvent(access_token, id, callback) {
  var getURL = calRoot + "calendars/" + calID + "/events/" + id + "?access_token=" + access_token;
  request.get({
    url: getURL,
    json: true
  }, callback);
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

function insertEvent(access_token, params, callback) {
  var postURL = calRoot + "calendars/" + calID + "/events?access_token=" + access_token;
  params.attendees = [{ 'email': params.resident1 + '@mit.edu' }];
  if (params.resident2) {
    params.attendees.push({ 'email': params.resident2 + '@mit.edu' });
  }
  if (params.resident3) {
    params.attendees.push({ 'email': params.resident3 + '@mit.edu' });
  }
  request.post({
    url: postURL,
    body: {
      'summary': params.room + " - " + params.resident1,
      'location': params.room,
      'description': params.reason,
      'start': { 'dateTime': params.timeMin },
      'end': { 'dateTime': params.timeMax },
      'status': 'tentative',  // until exec confirms or denies
      'attendees': params.attendees,
      'visibility': 'public'
    },
    json: true
  }, callback);
}

function confirmEvent(access_token, id, callback) {
  getEvent(access_token, id, function(err, res, body) {
    var updateURL = calRoot + "calendars/" + calID + "/events/" + id + "?access_token=" + access_token;
    body['status'] = 'confirmed';
    request.put({
      url: updateURL,
      body: body,
      json: true
    }, callback);
  });
}

function removeEvent(access_token, id, callback) {
  var delURL = calRoot + "calendars/" + calID + "/events/" + id + "?access_token=" + access_token;
  request.del({
    url: delURL,
    json: true
  }, callback);
}

function getEventsWithUser(user, callback) {
  gaccount.auth(function(err, access_token) {
    var now = new Date();
    now.setDate(now.getDate() - 1); var timeMin = toRFC3339(now);
    now.setDate(now.getDate() + MAX_DAYS); var timeMax = toRFC3339(now);
    listEvents(access_token, timeMin, timeMax, function(err, res, body) {
      var userEvents = [];
      var allEvents = [];
      // check if this is an event added by nextres, or by the GCalendar UI
      if (body.items) {
        body.items.sort(function(event1, event2) {
          return event1.updated > event2.updated;
        });
        for (var i = 0; i < body.items.length; i++) {
          if(typeof body.items[i].attendees != 'undefined'){
            for (var j = 0; j < body.items[i].attendees.length; j++) {
              var creator = body.items[i].attendees[j];
              body.items[i].formattedTime = formatRFC3339(body.items[i].start.dateTime);
              if (creator && creator.email === user.kerberos + '@mit.edu') {
                userEvents.push(body.items[i]);
              }
            }
          }
          allEvents.push(body.items[i]);
        }
      }
      callback(userEvents, allEvents);
    });
  });
}

Reservation.prototype.getEventsWithUser = getEventsWithUser;

Reservation.prototype.reserve = function(user, params, callback) {
  params.resident1 = user.kerberos;

  logger.info('Reservation request made. Params: ' + JSON.stringify(params));

  getEventsWithUser(user, function(userEvents) {
    if (userEvents.length >= 3) {
      callback({'error': 'Error: you may have no more than 3 outstanding reservations.'});
    } else {
      if (params.resident1 === params.resident2 ||
          params.resident1 === params.resident3 ||
          params.resident2 === params.resident3) {
            callback({'error': 'Duplicate resident field.'});
            return;
          }
      function isAllowed(kerberos, callback) {
        if (kerberos === '') {
          callback(true);
        } else {
          userModel.getKerberos(kerberos, function(error, user) {
            callback(user);
          });
        }
      };
      isAllowed(params.resident2, function(user) {
        if (!user) {
          callback({'error': 'Invalid kerberos for resident 2.'});
        } else {
          isAllowed(params.resident3, function(user_) {
            if (!user_) {
              callback({'error': 'Invalid kerberos for resident 3.'});
            } else {
              gaccount.auth(function(err, access_token) {
                // Set start and end datetimes.
                var startTime = new Date(params.date);
                startTimeTo24h = to24h(params.start);
                startTime.setHours(startTimeTo24h[0]); startTime.setMinutes(startTimeTo24h[1]);
                var endTime = new Date(params.date);
                endTimeTo24h = to24h(params.end);
                endTime.setHours(endTimeTo24h[0]); endTime.setMinutes(endTimeTo24h[1]);

                params.timeMin = toRFC3339(startTime);
                params.timeMax = toRFC3339(endTime);
                listEvents(access_token, params.timeMin, params.timeMax, function(err, res, body) {
                  /* Forbid conflicts */
                  if (body.items) {
                    for (var i = 0; i < body.items.length; i++) {
                      if (body.items[i].location === params.room) {
                        callback({'error': 'Reservation conflict'});
                        return;
                      }
                    }
                  }
                  logger.info('Successful reservation');
                  /* Update Google Calendar */
                  insertEvent(access_token, params, function(err, res, body) {
                    if (body['error']) {
                      logger.info('Malformed request ' + JSON.stringify(params));
                      callback({'error': 'Malformed request'});
                    } else {
                      logger.info('Put on google calendar as id ' + body.id);
                      callback({'success': 'Room successfully reserved'});
                      mailer.reserveRoom(params);
                    }
                  });
                });
              });
            }
          });
        }
      });
    }
  });
};



Reservation.prototype.removeReservation = function(user, id, callback) {
  logger.info(user.kerberos + ' removing reservation ' + id);
  gaccount.auth(function (err, access_token) {
    removeEvent(access_token, id, function(err, res, body) {
      callback(err);
    });
  });
}

Reservation.prototype.confirmReservation = function(user, id, callback) {
  logger.info(user.kerberos + ' confirming reservation ' + id);
  gaccount.auth(function (err, access_token) {
    confirmEvent(access_token, id, function(err, res, body) {
      callback(err);
    });
  });
}

Reservation.prototype.denyReservation = function(user, id, reason, callback) {
  logger.info(user.kerberos + ' denying reservation ' + id + ' because ' + reason);
  gaccount.auth(function (err, access_token) {
    getEvent(access_token, id, function(err, res, body) {
      mailer.denyRoom(body, reason);
    });
    removeEvent(access_token, id, function(err, res, body) {
      callback(err);
    });
  });
}

module.exports = Reservation
