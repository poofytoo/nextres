/*
Instructions for Reservation System with Google Calendar API

The google-oauth-serviceaccount module reads from a file oauth-config.json which should be in the same directory. This in turn reads from the private key.pem file that should also be in the same directory.

DO NOT COMMIT key.pem!
*/

var request = require('request');
var gaccount = require('google-oauth-serviceaccount');
var qs = require('qs');

const calRoot = "https://www.googleapis.com/calendar/v3/";
const calID = "87a94e6q5l0nb6bfphe3192uv8@group.calendar.google.com";

exports.reserve = function(user, params, callback) {
  // RFC 3339 format. New York time zone is -04:00
  // TODO does this still work when daylight savings comes along?
  var startTime = params.date.toString('yyyy-MM-dd') + 'T' + params.start.toString('hh:mm') + ':00.000-04:00';
  var endTime = params.date.toString('yyyy-MM-dd') + 'T' + params.end.toString('hh:mm') + ':00.000-04:00';
  gaccount.auth(function(err, access_token) {
    var listURL = calRoot + "calendars/" + calID + "/events?" +
      qs.stringify({
        'access_token': access_token,
        'timeMin': startTime,
        'timeMax': endTime,
      });
    request.get({
      url: listURL,
      json: true
    }, function(err, res, body) {
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
      var postURL = calRoot + "calendars/" + calID + "/events?access_token=" + access_token;
      request.post({
        url: postURL,
        body: {
          'summary': params.room + ' by ' + user.kerberos,
          'location': params.room,
          'description': params.reason,
          'start': { 'dateTime': startTime },
          'end': { 'dateTime': endTime },
        },
        json: true
      }, function(err, res, body) {
        callback({'success': 'Room successfully reserved'});
      });
    });
  });
};
