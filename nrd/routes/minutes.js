var util = require('./util');
var Minutes = require('../models/minutes').Minutes;
var logger = require('../models/logger');

// Maximum size of a Minute file, in bytes
const MAX_MINUTE_SIZE = 10000000;

function complete(req, res, success, err) {
  Minutes.getMinutes({sortBy: 'date', desc: true}, function(err2, minutes) {
    util.render(res, 'minutes', {
      user: req.user,
      minutes: minutes,
      success: success,
      error: err || err2
    });
  });
}

exports.list = function(req, res) {
  complete(req, res);
}

// req.params.minute is the id of the desired Minute object
exports.view = function(req, res) {
  Minutes.getMinute(req.params.minute, function(err, minute) {
    if (err) {
      complete(req, res);
      return;
    }
    res.sendfile(minute.path);
  });
}

// req.files.minute is the uploaded Minute file
// req.body.date is the date of the Minute, as a string
// e.g. {files: {minute: {name: 'Minute 1.pdf', size: 1024}},
//       date: '04-01-2014'}
exports.edit = function(req, res) {
  if (!req.files || req.files.minute.size == 0) {
    complete(req, res, null, 'No file chosen.');
  } else if (req.files.minute.size > MAX_MINUTE_SIZE) {
    complete(req, res, null, 'Maximum file size is 10 MB');
  } else {
    Minutes.addMinute(req.files.minute.name,
        req.body.date, req.files.minute, function(err) {
          complete(req, res, 'File successfully updated', err);
        });
  }
}

// req.body.id is the id of the desired Minute object
exports.remove = function(req, res) {
  Minutes.getMinute(req.body.id, function(err, minute) {
    minute.remove(function(err) {
      complete(req, res, 'File successfully removed', err);
    });
  });
}
