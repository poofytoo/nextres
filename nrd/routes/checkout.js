var util = require('./util');
var Checkout = require('../models/checkout').Checkout;
var Users = require('../models/user').Users;


const MAX_NUM_CHECKED_ITEMS = 3;
const NUM_RECENT_ITEMS_SHOWN = 20;

exports.viewonly = function(req, res) { 
    Checkout.getAllItems(function(err, items) {
        util.render(res, 'viewitems', {user: req.user, items: items, error: err});
    });
};

exports.list = function(req, res) { 
    Checkout.getAllItems(function(err, items) {
        util.render(res, 'checkout', {user: req.user, items: items, error: err});
    });
};

exports.listrecent = function(req, res) {
  Checkout.getRecentlyAddedItems(NUM_RECENT_ITEMS_SHOWN,
      function(err, itemList) {
        res.json(itemList);
      });
};

exports.additempage = function(req, res) {
  util.render(res, 'additempage', {user: req.user});
};

// req.body = {barcode: 12345}
// returns res.json(Item object)
// or res.json({error: 'Item not found'})
exports.get = function(req, res) {
  Checkout.getItemWithBarcode(req.body.barcode, function(err, item) {
    if (err) {
      res.json({error: err});
    } else {
      res.json(item);
    }
  });
};

// req.body = {mitID: 12345}
// returns res.json(User object with checkout data as array)
// or returns res.json({error: 'error'})
exports.getusercheckoutdata = function(req, res) {
  Users.findByMITId(req.body.mitID, function(err, user) {
    if (err) {
      res.json({error: err});
    } else {
      Checkout.getCheckedOutItems(user.kerberos, function(err, items) {
        if (err) {
          res.json({error: err});
        } else {
          user.items = items;
          res.json(user);
        }
      });
    }
  });
};

// req.body = {barcode: 12345}
// or req.body = {barcode: 12345, description: 'Back to the Future'}
// returns res.json(Item object)
// or res.json({error: 'Item not found'})
exports.add = function(req, res) {
  var complete = function(err, description) {
    if (err) {
      res.json({error: err});
    } else {
      Checkout.addItem(req.body.barcode, description,
          new Date().getTime(), function(err) {
            Checkout.getItemWithBarcode(req.body.barcode, function(err2, item) {
              if (err || err2) {
                res.json({error: err || err2});
              } else {
                res.json(item);
              }
            });
          });
    }
  };
  if (req.body.description) {
    complete(false, req.body.description);
  } else {
    Checkout.getUPCItem(req.body.barcode, complete);
  }
};

// req.body = {kerberos: 'kyc2915', barcode: 12345}
// returns res.json({error: 'Error'})
// or res.json(Item object)
exports.checkout = function(req, res) {
  var kerberos = req.body.kerberos;
  Checkout.getCheckedOutItems(kerberos, function(err, items) {
    if (err) {
      res.json({error: err});
    } else if (items.length >= MAX_NUM_CHECKED_ITEMS) {
      res.json({error: 'This user has too many checked out items.'});
    } else {
      Checkout.getItemWithBarcode(req.body.barcode, function(err, item) {
        if (err) {
          res.json({error: err});
        } else {
          item.checkout(kerberos, 'deskworker',
            new Date().getTime(), function(err) {
              res.json(item);
            });
        }
      });
    }
  });
};

// req.body = {barcode: 12345}
// returns res.json({error: 'Error'})
// or res.json(Item object)
exports.checkin = function(req, res) {
  Checkout.getItemWithBarcode(req.body.barcode, function(err, item) {
    if (err) {
      res.json({error: err});
    } else {
      item.checkin('deskworker', function(err) {
        res.json(item);
      });
    }
  });
};

// req.body = {barcode: 12345}
// returns res.json({error: 'Error'})
exports.remove = function(req, res) {
  Checkout.getItemWithBarcode(req.body.barcode, function(err, item) {
    if (err) {
      res.json({error: err});
    } else {
      item.remove(function(err) {
        res.json({error: err});
      });
    }
  });
};
