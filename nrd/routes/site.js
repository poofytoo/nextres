var util = require('./util');
var Model = require('../models/model');
var model = new Model();

exports.index = function(req, res) {
  util.registerContent('home');
  model.getPermissions(req.user.id, function(permissions) {
    res.render('base.html', {'user': req.user, 'permissions': permissions});
  });
}

exports.home = function(req, res) {
  if (req.user !== undefined) {
    util.registerContent('home');
    model.getPermissions(req.user.id, function(permissions) {
      res.render('base.html', {'user': req.user, 'permissions': permissions});
    });
  } else {
    res.render('login.html');
  }
}