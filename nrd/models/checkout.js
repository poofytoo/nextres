var request = require('request');
var Database = require('./db');
var logger = require('./logger');

function Checkout() {
  this.db = new Database();
};

Checkout.prototype.getItemsListing = function(user, callback) {
  this.db.query().
    select(['*']).
    from('next-checkout-items');
  this.db.execute(function(error, result) {
    var itemList = result;
    callback(itemList);
  });
}

Checkout.prototype.addItem = function(barcode, description, callback) {
  var db = this.db;
  var lookupUPC = description == null;

  var finishAddItem = function(barcode, description) {
      console.log(barcode + " " + description);
    db.query().
      insert('next-checkout-items',
        ['itemcode', 'title', 'status', 'borrower'],
        [barcode, description, 'available', '']);
    db.execute(function(err, res) {
      if (err) {
        callback({'error': err});
      } else {
        callback({'description': description});
      }
    });
  };

  if (lookupUPC) {
    // Key for UPC lookup database
    // upcdatabase.org, sparkyroombot login credentials
    request('http://api.upcdatabase.org/json/534ec547b0800b428470cf62b158388e/' + barcode,
      function(error, response, body) {
        if (error || response.statusCode != 200) {
          callback({'error': error});
          return;
        } else {
          var result = JSON.parse(body);
          if (!result.valid) {
            callback({'error': 'Item not found'});
          } else {
            finishAddItem(barcode, result.description);
          }
        }
      });
  } else {
    finishAddItem(barcode, description);
  }
}

// Returns (error, item status)
//   item status: either a kerberos string, or empty string if no borrower.
Checkout.prototype.getItemStatus = function(barcode, callback) {
  this.db.query().
    select(['borrower']).
    from('next-checkout-items').
    where('itemcode = ?', [barcode]);
  this.db.execute(function(err, res) {
    if (err) {
      callback(err, "");
    } else if (res.length == 0) {
      callback(false, "");  // new item
    } else {
      callback(res[0].borrower);
    }
  });
}

// Get kerberos of user with given MIT ID.
// Returns false if none found.
Checkout.prototype.getUsername = function(id, callback) {
  logger.info("Checkout getUsername " + id);
  this.db.query().
    select(['kerberos']).
    from('next-users').
    where('mitID = ?', [id]);
  this.db.execute(function(err, res) {
    if (err || res.length == 0) {
      callback(false);
    } else {
      callback(res[0].kerberos);  // should be only one
    }
  });
}

// Returns kerberos starting with the id substring.
Checkout.prototype.getKerberos = function(id, callback) {
  logger.info("Checkout getKerberos " + id);
  this.db.query().
    select(['kerberos']).
    from('next-users').
    where('kerberos LIKE ?', [id + '%']);  // starts with id
  this.db.execute(function(err, res) {
    if (err) {
      callback(false);
    } else {
      var kerberos = [];
      for (var i = 0; i < Math.min(5, res.length); i++) {
        kerberos.push(res[i].kerberos);
      }
      callback(kerberos);
    }
  });
}

// Saves the kerberos with the given id.
Checkout.prototype.saveKerberos = function(kerberos, mitID, callback) {
  logger.info("Checkout saveKerberos " + kerberos + " " + mitID);
  this.db.query().
    update('next-users', ['mitID'], [mitID]).
    where('kerberos = ?', [kerberos]);
  this.db.execute(function(err, res) {
    if (err) {
      callback(err);
    } else {
      callback(false);
    }
  });
}

// Checks out the given item.
// Use "" for kerberos if checking an item back in.
Checkout.prototype.checkoutItem = function(kerberos, itemBarcode, callback) {
  logger.info("Checkout checkoutItem " + kerberos + " " + itemBarcode);
  var itemStatus = 'available';
  if (kerberos) {
    itemStatus = 'checked out';
  }
  this.db.query().
    update('next-checkout-items', ['status', 'borrower'], [itemStatus, kerberos]).
    where('itemcode = ?', [itemBarcode]);
  this.db.execute(function(err, res) {
    if (err) {
      callback(err);
    } else {
      callback(false);
    }
  });
}

module.exports = Checkout;
