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

// POST {itemBarcode: 12345}
// or POST {itemBarcode: 12345, description: Back to the Future} (manually entered)
// res.json({description: Back to the Future})
// or res.json({error: 'Item not found'})
exports.additem = function(req, res) {
  if (req.user !== undefined) {
    checkoutModel.addItem(req.body.itemBarcode, req.body.description, function(result) {
      res.json(result);
    });
  } else {
    res.redirect('/login');
  }
}

// POST {id: 98765}
// res.json(kyc2915)
exports.getusername = function(req, res) {
  if (req.user !== undefined) {
    checkoutModel.getUsername(req.body.id, function(username) {
      res.json(username);
    });
  } else {
    res.redirect('/login');
  }
}

// POST {id: ky}
// res.json([kyc2915, kysomebodyelse])
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

// POST {id: kyc2915, mitID: 98765}
// res.json(false)
exports.savekerberos = function(req, res) {
  if (req.user !== undefined) {
    checkoutModel.saveKerberos(req.body.id, req.body.mitID, function(error) {
      res.json(error);
    });
  } else {
    res.redirect('/login');
  }
}

// POST {itemBarcode: 12345}
// res.json(kyc2915)  or "" if no one is borrowing this item
exports.getitemstatus = function(req, res) {
  if (req.user !== undefined) {
    checkoutModel.getItemStatus(req.body.itemBarcode, function(itemStatus) {
      res.json(itemStatus);
    });
  } else {
    res.redirect('/login');
  }
}

// POST {itemBarcode: 12345}
// res.json(false)
exports.checkinitem = function(req, res) {
  if (req.user !== undefined) {
    checkoutModel.checkoutItem("", req.body.itemBarcode, function(error) {
      res.json(error);
    });
  } else {
    res.redirect('/login');
  }
}

// POST {userKerberos: kyc2915, itemBarcode: 12345}
// res.json(false)
exports.checkoutitem = function(req, res) {
  if (req.user !== undefined) {
    checkoutModel.checkoutItem(req.body.userKerberos, req.body.itemBarcode, function(error) {
      res.json(error);
    });
  } else {
    res.redirect('/login');
  }
}
