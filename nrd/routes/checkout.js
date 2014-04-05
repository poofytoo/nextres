var util = require('./util');
var Checkout = require('../models/checkout');
var checkoutModel = new Checkout();

exports.view = function(req, res) {
  if (req.user !== undefined) {
    util.registerContent('checkout');
    checkoutModel.getAllItems(function(itemList) {
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

exports.additempage = function(req, res) {
  if (req.user !== undefined) {
    util.registerContent('additempage');
    res.render('base.html', {
      user: req.user,
      permissions: req.permissions,
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
    if (req.body.description) {
      checkoutModel.addItem(req.body.itemBarcode, req.body.description, function() {});
      res.json({'description': req.body.description});
    } else {
      checkoutModel.getUPCItem(req.body.itemBarcode, function(barcode, name) {
        if (name) {
          checkoutModel.addItem(req.body.itemBarcode, name, function() {});
          res.json({'description': name});
        } else {
          res.json({'error': 'Item not found'});
        }
      });
    };
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
// res.json(Item), or res.json(false) if no item has the specified barcode
exports.getitemstatus = function(req, res) {
  if (req.user !== undefined) {
    checkoutModel.getItemWithBarcode(req.body.itemBarcode, function(item) {
      res.json(item);
    });
  } else {
    res.redirect('/login');
  }
}

// POST {itemBarcode: 12345}
// res.json(Item)
exports.checkinitem = function(req, res) {
  if (req.user !== undefined) {
    checkoutModel.checkinItem(req.body.itemBarcode, 'deskworker', function() {
      checkoutModel.getItemWithBarcode(req.body.itemBarcode, function(item) {
        res.json(item);
      });
    });
  } else {
    res.redirect('/login');
  }
}

// POST {userKerberos: kyc2915, itemBarcode: 12345}
// res.json(false)
exports.checkoutitem = function(req, res) {
  if (req.user !== undefined) {
    checkoutModel.checkoutItem(req.body.itemBarcode,
        req.body.userKerberos, 'deskworker', function() {
      checkoutModel.getItemWithBarcode(req.body.itemBarcode, function(item) {
        res.json(item);
      });
    });
  } else {
    res.redirect('/login');
  }
}
