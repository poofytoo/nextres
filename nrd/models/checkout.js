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

// Get kerberos of user with given MIT ID.
// Returns false if none found.
Checkout.prototype.getUsername = function(id, callback) {
  logger.info("Checkout getUsername " + id);
  this.db.query().
    select(['kerberos']).
    from('next-users').
    where('mitID == ?', [id]);
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
Checkout.prototype.checkoutItem = function(kerberos, itemBarcode, callback) {
  logger.info("Checkout checkoutItem " + kerberos + " " + itemBarcode);
  this.db.query().
    update('next-checkout-items', ['status'], ['checked out']).
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
