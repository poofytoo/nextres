/*
 * Room Reservations API
 *
 * A Reservation object corresponds the 'Event' resource as used in the
 *   Google Calendar API. It contains the following fields:
 *      id: unique int id
 *      start
 *        dateTime: start time (RFC3339 string)
 *      end
 *        dateTime: end time (RFC3339 string)
 *      location: location of event (string)
 *      description: description of event (string)
 *      summary: title of event (string)
 *      created: when the event was made (RFC3339 string)
 *      updated: when the event was last changed (RFC3339 string)
 *      status: status of event, either 'tentative' or 'confirmed'
 *      visibility: visibility of event, either 'public' or 'private'
 *      attendees
 *        attendee 1
 *          email: email 1
 *        attendee 2
 *          email: email 2
 *        ...
 *
 * The maximum number of signatories is given by MAX_NUM_SIGNATORIES.
 *
 * e.g. {id: 1, start: {dateTime: '2014-04-01T20:00:00.000Z'},
 *   end: {dateTime: '2014-04-01T23:00:00.000Z'},
 *   location: 'Country Kitchen',
 *   description: 'Cooking things',
 *   summary: 'Country Kitchen - kyc2915',
 *   created: '2014-03-25T00:00:00.000Z',
 *   updated: '2014-03-26T00:00:00.000Z',
 *   status: 'confirmed',
 *   attendees: [{email: 'kyc2915@mit.edu'}, {email: 'beckyshi@mit.edu'}]}
 *
 * Notes: the google-oauth-serviceaccount module reads from a file
 *   oauth-config.json which should be in the base directory. That
 *   file in turn reads from the private key.pem file that should
 *   also be in the base directory. Do NOT commit key.pem!
 */

var gaccount = require('google-oauth-serviceaccount');
var qs = require('qs');
var request = require('request');
var time = require('time');
var df = require('./dateformat');
var logger = require('./logger');
var Mailer = require('./mailer').Mailer;
var User = require('./user').User;

var calendar_settings = require('./config').config_data.calendar_settings;

const BASE_URL = "https://www.googleapis.com/calendar/v3/calendars/";
const TIME_ZONE = 'America/New_York';
const MAX_NUM_SIGNATORIES = 3;
const NUM_DAYS_WHERE_RESERVATION_IS_VISIBLE = 60;

function Reservations() {
  this.MAX_NUM_SIGNATORIES = MAX_NUM_SIGNATORIES;
}

function signatoryField(index) {
  return 'signatory' + index;
}

Reservations.prototype.signatoryField = signatoryField;

// Format RFC3339 string to human readable format
function formatRFC3339(str) {
  var parts = str.split('T');
  var day = parts[0], time = parts[1].substring(0, 5);
  return time + " on " + day;
}

function Reservation(reservation) {
  this.id = reservation.id;
  this.start = {dateTime: reservation.start.dateTime};
  this.end = {dateTime: reservation.end.dateTime};
  this.location = reservation.location;
  this.description = reservation.description;
  this.summary = reservation.summary;
  this.created = reservation.created;
  this.updated = reservation.updated;
  this.status = reservation.status;
  this.attendees = [];
  for (var i = 0; i < MAX_NUM_SIGNATORIES; i++)
    if (reservation.attendees[i]) {
      this.attendees.push({email: reservation.attendees[i].email});
    }
  this.formattedTime = formatRFC3339(this.start.dateTime);
}

// Convert a Javascript Date object to RFC3339 format used by Google.
function toRFC3339(datetime) {
  return df.dateFormat(time.Date(datetime, TIME_ZONE),
          "yyyy-mm-dd'T'HH:MM:00.000o");
}

// Convert a time (h:mm(am/pm)) object to a list [hours, minutes]
//   where hours is an integer from 0 to 23 inclusive.
function to24h(time) {
  if (!time.match(/[0-9]:[0-5][0-9][ap]m/) &&
      !time.match(/1[0-2]:[0-5][0-9][ap]m/)) {
    return 'invalid';  // anything that will error when given to Calendar API
  }
  if (time === '12:00am') {
    // Hack - if an event ends at midnight, change it to end at 11:59pm
    //   so that both the start and end times are on the same day.
    return [23, 59];
  }
  var hours = time.substring(0, time.indexOf(':'));
  var minutes = time.substring(time.indexOf(':') + 1, time.length - 2);
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

// Convert RFC3339 format datetime to human-readable representation
function formatRFC3339(str) {
  var parts = str.split('T');
  var day = parts[0], time = parts[1].substring(0, 5);
  return time + ' on ' + day;
}


// callback(err, res, body) where body is the Event resource with the given ID
function getEvent(access_token, id, callback) {
  var getURL = BASE_URL + calendar_settings.calID + '/events/' +
    id + '?access_token=' + access_token;
  request.get({url: getURL, json: true}, callback);
}

// timeMin and timeMax are RFC3339 formatted datetimes.
// callback(err, res, body) where body.items is a list of Event resources
//   between timeMin and timeMax.
function listEvents(access_token, timeMin, timeMax, callback) {
  var listURL = BASE_URL + calendar_settings.calID + '/events?' +
    qs.stringify({
      'access_token': access_token,
      'timeMin': timeMin,
      'timeMax': timeMax
    });
  request.get({url: listURL, json: true}, callback);
}

// Adds newEvent to the Google Calendar, where newEvent is an Event resource.
// callback(err, res, body) where body.err is the API error.
function insertEvent(access_token, newEvent, callback) {
  var postURL = BASE_URL + calendar_settings.calID + '/events?access_token='
    + access_token;
  request.post({url: postURL, body: newEvent, json: true}, callback);
}

// Confirms the Event with the given ID.
function editEvent(access_token, editedEvent, callback) {
  var updateURL = BASE_URL + calendar_settings.calID + '/events/' +
    editedEvent.id + '?access_token=' + access_token;
  request.put({url: updateURL, body: editedEvent, json: true}, callback);
}

// Deletes the Event with the given ID.
function removeEvent(access_token, id, callback) {
  var delURL = BASE_URL + calendar_settings.calID + '/events/' +
    id + '?access_token=' + access_token;
  request.del({url: delURL, json: true}, callback);
}

/******************************************************************************
 *
 * READ FUNCTIONS
 *
 ******************************************************************************/

/*
 * Returns a list of Reservations from the Google Calendar, from today until
 *   NUM_DAYS_WHERE_RESERVATION_IS_VISIBLE later.
 * now is a Javascript Date object representing the current time.
 */
Reservations.prototype.getReservations = function(now, callback) {
  gaccount.auth(function(err, access_token) {
    // Calculate today and NUM_DAYS_WHERE_RESERVATION_IS_VISIBLE later.
    now = new Date(now);
    now.setDate(now.getDate() - 1);
    var timeMin = toRFC3339(now);
    now.setDate(now.getDate() + NUM_DAYS_WHERE_RESERVATION_IS_VISIBLE);
    var timeMax = toRFC3339(now);

    // List all events between timeMin and timeMax
    listEvents(access_token, timeMin, timeMax, function(err, res, body) {
      if (err) {
        callback(err);
      } else if (!body.items) {
        callback('Error with Google Calendar listEvents() API');
      } else {
        // Sort by last updated time
        body.items.sort(function(event1, event2) {
          return event1.updated > event2.updated;
        });
        // Apply constructor to all Events, to make into Reservation objects
        // Events added directly by next-exec do not have attendees.
        var reservations = [];
        for (var i = 0; i < body.items.length; i++) {
          if (body.items[i].attendees) {
            reservations.push(new Reservation(body.items[i]));
          }
        }
        callback(false, reservations);
      }
    });
  });
}

/*
 * Returns a list of Reservations from the Google Calendar, from today until
 *   NUM_DAYS_WHERE_RESERVATION_IS_VISIBLE later, from the given user.
 * now is a Javascript Date object representing the current time.
 */
Reservations.prototype.getReservationsWithUser = function(now, user, callback) {
  this.getReservations(now, function(err, reservations) {
    if (err) {
      callback(err);
      return;
    }
    var userReservations = [];
    for (var i = 0; i < reservations.length; i++) {
      var reservation = reservations[i];
      for (var j = 0; j < reservation.attendees.length; j++) {
        var attendee = reservation.attendees[j];
        if (attendee && attendee.email === user.email) {
          userReservations.push(reservation);
          break;
        }
      }
    }
    callback(false, userReservations);
  });
}

/*
 * Returns the Reservation with the given ID, or false if nonexistent
 */
Reservations.prototype.getReservation = function(id, callback) {
  gaccount.auth(function(err, access_token) {
    getEvent(access_token, id, function(err, res, event) {
      callback(err, new Reservation(event));
    });
  });
}

/******************************************************************************
 *
 * EDIT FUNCTIONS
 *
 ******************************************************************************/

/*
 * Creates a new Reservation with params, which has the following fields:
 *      signatory1: kerberos of 1st signatory
 *      signatory2: kerberos of 2nd signatory
 *      ...
 *      date: date of reservation (string)
 *      start: h:mm(am/pm) formatted start time
 *      end: h:mm(am/pm) formatted end time
 *      room: location of reservation
 *      reason: reason for reservation
 * and notifies next-exec via email.
 *
 * e.g. {signatory1: 'kyc2915', signatory2: 'beckyshi', date: '2014-04-01',
 *   start: '8:00pm', end: '11:00pm', room: 'Country Kitchen',
 *   description: 'Cooking things'}
 */
Reservations.prototype.reserve = function(params, callback) {
  logger.info('Reservation request made. Params: ' + JSON.stringify(params));
  gaccount.auth(function(err, access_token) {
    // Construct start and end Date objects
    var startTime = new Date(params.date);
    startTime.setHours(to24h(params.start)[0]);
    startTime.setMinutes(to24h(params.start)[1]);
    var endTime = new Date(params.date);
    endTime.setHours(to24h(params.end)[0]);
    endTime.setMinutes(to24h(params.end)[1]);

    // Construct attendees list
    var attendees = [];
    for (var i = 1; i <= MAX_NUM_SIGNATORIES; i++) {
      var kerberos = params[signatoryField(i)];
      if (kerberos) {
        attendees.push({email: kerberos + '@mit.edu'});
      }
    }

    listEvents(access_token, toRFC3339(startTime), toRFC3339(endTime),
      function(err, res, body) {
        // Check for conflicts
        if (body.items) {
          for (var i = 0; i < body.items.length; i++) {
            if (body.items[i].location === params.room) {
              callback('Reservation conflict');
              return;
            }
          }
        }

        // Construct new Event resource
        var newEvent = {
          start: {dateTime: toRFC3339(startTime)},
          end: {dateTime: toRFC3339(endTime)},
          location: params.room,
          description: params.reason,
          summary: params.room + ' - ' + params.signatory1,
          status: 'tentative',
          visibility: 'public',
          attendees: attendees
        };

        // Add new Event to calendar
        insertEvent(access_token, newEvent, function(err, res, body) {
          if (body.error) {
            logger.info('Malformed request ' + JSON.stringify(params));
            callback('Malformed request.');
          } else {
            logger.info('Put on google calendar as id ' + body.id);
            Mailer.reserveRoom(params, attendees);
            callback(false);
          }
        });
      });
  });
}

/******************************************************************************
 *
 * OBJECT FUNCTIONS (must be called on a GuestList object)
 *
 ******************************************************************************/

/*
 * Confirm this reservation.
 */
Reservation.prototype.confirm = function(callback) {
  var id = this.id;
  gaccount.auth(function(err, access_token) {
    getEvent(access_token, id, function(err, res, event) {
      event.status = 'confirmed';
      editEvent(access_token, event, function(err, res, body) {
        callback(err || body.error);
      });
    });
  });
}

/*
 * Deny this reservation.
 */
Reservation.prototype.deny = function(reason, callback) {
  Mailer.denyRoom(this, reason);
  this.remove(callback);
}

/*
 * Remove this reservation.
 */
Reservation.prototype.remove = function(callback) {
  var id = this.id;
  gaccount.auth(function(err, access_token) {
    removeEvent(access_token, id, callback);
  });
}

module.exports.Reservations = new Reservations();
