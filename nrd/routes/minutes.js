var fs = require('fs');
var util = require('./util');
var Model = require('../models/model');
var model = new Model();
var Minutes = require('../models/meetingminutes')
var minutesModel = new Minutes();
var logger = require('../models/logger');

exports.viewminutes = function(req, res) {
  if (req.query.minute) {
    res.sendfile('minutes/' + req.query.minute);
  } else {
    util.registerContent('minutes');
    minutesModel.getFiles(function(error, files) {
    res.render('base.html', {user: req.user, permissions: req.permissions, files: files});
    });
  }
}

exports.editminutes = function(req, res) {
  util.registerContent('minutes');
  var error = '';
  if (!req.permissions.EDITMINUTES) {
    error = 'Invalid permissions.';
  } else if (!req.files || req.files.minute.size == 0) {
    error = 'No file chosen.';
  } else if (req.files.minute.size > 10000000) {
    error = 'Maximum file size is 10 MB';
  }
  if (error) {
    minutesModel.getFiles(function(error, files) {
      res.render('base.html', {user: req.user,
        permissions: req.permissions,
        files: files,
        error: error});
    });
  } else {
    logger.info('Uploading file ' + req.files.minute.name);
    fs.readFile(req.files.minute.path, function(err, data) {
      var dest = "minutes/" + req.files.minute.name;
      minutesModel.addFile(req.files.minute.name, req.body.date, function(error) {
        fs.writeFile(dest, data, function(err) {
          minutesModel.getFiles(function(error, files) {
            res.render('base.html', {user: req.user,
              permissions: req.permissions,
              files: files,
              success: 'File successfully uploaded'});
          });
        });
      });
    });
  }
}

exports.removeminutes = function(req, res) {
  if (!req.permissions.EDITMINUTES) {
    minutesModel.getFiles(function(error, files) {
      logger.info('files: ' + files);
      res.render('base.html', {user: req.user,
        permissions: req.permissions,
        files: files,
        error: 'Invalid permissions.'});
    });
  } else if (req.body.id) {
    minutesModel.removeFile(req.body.id, function(error) {
      minutesModel.getFiles(function(error, files) {
        logger.info('files: ' + files);
        res.render('base.html', {user: req.user,
          permissions: req.permissions,
          files: files,
          success: 'File successfully removed'});
      });
    });
  } else {
    res.redirect('/minutes');
  }
}
