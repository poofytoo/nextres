var util = require('./util');

exports.view = function(req, res) {
  util.render(res, 'emaillists', {user: req.user});
};
