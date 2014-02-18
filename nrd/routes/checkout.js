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

exports.getusername = function(req, res) {
  if (req.user !== undefined) {
    checkoutModel.getUsername(req.body.id, function(username) {
      res.json(username);
    });
  } else {
    res.redirect('/login');
  }
}

exports.getkerberos = function(req, res) {
  if (req.user !== undefined) {
    // Note: req.id is part of a kerberos, e.g. ky
    // Returns a list of kerberos
    checkoutModel.getKerberos(req.body.id, function(kerberos) {
      res.json(kerberos);
    });
  } else {
    res.redirect('/login');
  }
}

exports.savekerberos = function(req, res) {
  if (req.user !== undefined) {
    checkoutModel.saveKerberos(req.body.id, 'mitID here', function(error) {
      res.json(error);
    });
  } else {
    res.redirect('/login');
  }
}

exports.checkoutitem = function(req, res) {
  if (req.user !== undefined) {
    checkoutModel.checkoutItem(req.body.userKerberos, req.body.itemBarcode, function(error) {
      res.json(error);
    });
  } else {
    res.redirect('/login');
  }
}
