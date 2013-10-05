var request = require('request');
var gaccount = require('google-oauth-serviceaccount');
var qs = require('qs');

const calRoot = "https://www.googleapis.com/calendar/v3/";
const calID = "87a94e6q5l0nb6bfphe3192uv8@group.calendar.google.com";

exports.reserve = function(user, params, callback) {
  // params contains date, startTime, endTime, room, and reason
  gaccount.auth(function(err, access_token) {
    var postURL = calRoot + "calendars/" + calID + "/events?access_token=" + access_token;
console.log('user: ' + user);
    request.post({
      url: postURL,
      body: {
        'summary': user.kerberos,
        'location': params.room,
        'description': params.reason,
        'start': { 'dateTime': params.start.toString('yyyy-MM-ddThh:mm') + ':00.000-04:00' },
        'end': { 'dateTime': params.end.toString('yyyy-MM-ddThh:mm') + ':00.000-04:00' }
      },
      json: true
    }, function(err, res, body) {
      callback();
    });
  });
};
