var fs = require('fs');
var util = require('./util');
var Model = require('../models/model');
var model = new Model();
var Minutes = require('../models/meetingminutes')
var minutesModel = new Minutes();

exports.viewminutes = function(req, res) {
  if (req.user !== undefined) {
    if (req.query.minute) {
      res.sendfile('minutes/' + req.query.minute);
    } else {
      util.registerContent('minutes');
      minutesModel.getFiles(function(error, files) {
        model.getPermissions(req.user.id, function(permissions) {
          res.render('base.html', {user: req.user, permissions: permissions, files: files});
        });
      });
    }
  } else {
    res.redirect('/login');
  }
}

exports.editminutes = function(req, res) {
  if (req.user !== undefined) {
    util.registerContent('minutes');
    var error = '';
    model.getPermissions(req.user.id, function(permissions) {
      if (!permissions.EDITMINUTES) {
        error = 'Invalid permissions.';
      } else if (!req.files || req.files.minute.size == 0) {
        error = 'No file chosen.';
      } else if (req.files.minute.size > 10000000) {
        error = 'Maximum file size is 10 MB';
      }
      if (error) {
        minutesModel.getFiles(function(error, files) {
          res.render('base.html', {user: req.user,
            permissions: permissions,
            files: files,
            error: error});
        });
      } else {
        console.log('Uploading file ' + req.files.minute.name);
        fs.readFile(req.files.minute.path, function(err, data) {
          var dest = "minutes/" + req.files.minute.name;
          minutesModel.addFile(req.files.minute.name, req.body.date, function(error) {
            fs.writeFile(dest, data, function(err) {
              minutesModel.getFiles(function(error, files) {
                res.render('base.html', {user: req.user,
                  permissions: permissions,
                  files: files,
                  success: 'File successfully uploaded'});
              });
            });
          });
        });
      }
    });
  } else {
    res.redirect('/login');
  }
}

exports.removeminutes = function(req, res) {
  if (req.user !== undefined) {
    model.getPermissions(req.user.id, function(permissions) {
      if (!permissions.EDITMINUTES) {
        minutesModel.getFiles(function(error, files) {
          console.log('files: ' + files);
          res.render('base.html', {user: req.user,
            permissions: permissions,
            files: files,
            error: 'Invalid permissions.'});
        });
      } else if (req.query.minute) {
        minutesModel.removeFile(req.query.minute, function(error) {
          minutesModel.getFiles(function(error, files) {
            console.log('files: ' + files);
            res.render('base.html', {user: req.user,
              permissions: permissions,
              files: files,
              success: 'File successfully removed'});
          });
        });
      } else {
        res.redirect('/minutes');
      }
    });
  } else {
      res.redirect('/login');
  }
}
