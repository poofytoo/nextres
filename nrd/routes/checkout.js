var util = require('./util');
var Checkout = require('../models/checkout');
var checkoutModel = new Checkout();

exports.view = function(req, res) {
  if (req.user !== undefined) {
    util.registerContent('checkout');
    checkoutModel.getItemsListing(req.user, function(itemList) {
      res.render('base.html', {
        user: req.user,
        permissions: req.permissions,
        itemList: itemList
      });
    });
  } else {
    res.redirect('/login');
  }
};