var util = require('./util');
var logger = require('../models/logger');

exports.view = function(req, res) {
  util.render(res, 'emaillists', {user: req.user});
}
