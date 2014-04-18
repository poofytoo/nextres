/*
 * ITEM CHECKOUT SYSTEM API
 *
 * The fields of the database are:
 * ID (unique int)
 * barcode (int)
 * name (string)
 * timeAdded (datetime): time (milliseconds) that the item was added to the database
 * borrower (string): kerberos currently checked out to, or empty string
 * timeBorrowed (int): time (milliseconds) that the borrower checked out the item
 * deskworker (string): kerberos of deskworker who last checkout out/in the item
 *
 * An Item javascript object consists of the above five attributes.
 *
 *
 * Read functions:
 * getAllItems(): returns a list of all Items
 * getReservedItems(): returns a list of all Items with borrower != ""
 * getUnreservedItems(): returns a list of all Items with borrower == ""
 * getItemWithBarcode(barcode): returns one Item, or false
 * getCheckedOutItems(kerberos): returns a list of all checked out Items
 * getRecentlyCheckedOutItems(numMilliseconds): returns a list of all Items with
 *      time within numSeconds of current time
 * getRecentlyAddedItems(limit): returns a list of length at most = limit,
 *      of Items that are most recently added
 * searchItems(pattern): returns a list of all Items whose name contains
 *      the specified substring
 *
 * Edit functions:
 * addItem(barcode, name)
 * removeItem(barcode): removes the Item with the given ID
 * checkoutItem(barcode, kerberos, deskworker)
 * checkinItem(barcode, deskworker)
 *
 * MIT ID database functions:
 *
 * getUsername(MITID): returns a kerberos, or false if none matches this MITID
 * getKerberos(pattern): returns a list of all kerberos starting with given pattern
 * saveKerberos(kerberos, MITID): attaches the MITID to the specified kerberos
 *
 * UPC database functions:
 * getUPCItem(barcode): callback with two parameters: (barcode, title)
 *      if the barcode exists in the UPC database; otherwise callback(false)
 */

var request = require('request');
var Database = require('./db');
var logger = require('./logger');

function Checkout() {
  this.db = new Database();
};

// Convenience helper method for select queries with a where and order clause
function get(db, whereClause, whereArgs, callback) {
  db.query().select(['*']).from('next-checkout-items')
    .where(whereClause, whereArgs);
  db.execute(function(error, result) {
    callback(result);
  });
}

// Read functions
Checkout.prototype.getAllItems = function(callback) {
  get(this.db, 'true', [], callback);
}

Checkout.prototype.getReservedItems = function(callback) {
  get(this.db, 'borrower != ?', [''], callback);
}

Checkout.prototype.getUnreservedItems = function(callback) {
  get(this.db, 'borrower = ?', [''], callback);
}

Checkout.prototype.getItemWithBarcode = function(barcode, callback) {
  get(this.db, 'barcode = ?', [barcode], function(result) {
    if (result.length >= 1) {
      callback(result[0]);
    } else {
      callback(false);
    }
  });
}

Checkout.prototype.getCheckedOutItems = function(kerberos, callback) {
  get(this.db, 'borrower = ?', [kerberos], callback);
}

Checkout.prototype.getAllCheckedOutItems = function(callback) {
 get(this.db, 'borrower != ?', [''], callback); 
}

Checkout.prototype.getRecentlyCheckedOutItems = function(numMilliseconds, callback) {
  var now = new Date().getTime();
  this.db.query().select(['*']).from('next-checkout-items')
    .where('borrower != ? & timeBorrowed > ?', ['', now - numMilliseconds])
    .orderByDESC('timeBorrowed');
  this.db.execute(function(error, result) {
    callback(result);
  });
}

Checkout.prototype.getRecentlyAddedItems = function(limit, callback) {
  this.db.query().select(['*']).from('next-checkout-items')
    .orderByDESC('timeAdded')
    .limit(limit);
  this.db.execute(function(error, result) {
    callback(result);
  });
}

Checkout.prototype.searchItems = function(pattern, callback) {
  get(this.db, 'name LIKE ?', ['%' + pattern + '%'], callback);
}

// Edit functions

Checkout.prototype.addItem = function(barcode, name, callback) {
  var now = new Date().getTime();
  this.db.query().insert('next-checkout-items',
        ['barcode', 'name', 'timeAdded'], [barcode, name, now]);
  this.db.execute(callback);
}

Checkout.prototype.removeItem = function(barcode, callback) {
  this.db.query().deleteFrom('next-checkout-items')
    .where('barcode = ?', [barcode]);
  this.db.execute(callback);
}

Checkout.prototype.checkoutItem = function(barcode, kerberos, deskworker, callback) {
  var now = new Date().getTime();
  this.db.query().update('next-checkout-items',
        ['borrower', 'timeBorrowed', 'deskworker'], [kerberos, now, deskworker])
    .where('barcode = ?', [barcode]);
  this.db.execute(callback);
}

Checkout.prototype.checkinItem = function(barcode, deskworker, callback) {
  this.db.query().update('next-checkout-items',
        ['borrower', 'timeBorrowed', 'deskworker'], ['', 0, deskworker])
    .where('barcode = ?', [barcode]);
  this.db.execute(callback);
}

// MIT ID database functions

Checkout.prototype.getUsername = function(id, callback) {
  this.db.query().select(['kerberos']).from('next-users').
    where('mitID = ?', [id]);
  this.db.execute(function(err, res) {
    if (res.length == 0) {
      callback(false);
    } else {
      callback(res[0].kerberos);  // should be only one
    }
  });
}

// Returns kerberos starting with the id substring.
Checkout.prototype.getKerberos = function(id, callback) {
  this.db.query().select(['kerberos']).from('next-users').
    where('kerberos LIKE ?', [id + '%']);  // starts with id
  this.db.execute(function(err, res) {
    var kerberos = [];
    for (var i = 0; i < Math.min(5, res.length); i++) {
      kerberos.push(res[i].kerberos);
    }
    callback(kerberos);
  });
}

// Saves the kerberos with the given id.
Checkout.prototype.saveKerberos = function(kerberos, mitID, callback) {
  this.db.query().update('next-users', ['mitID'], [mitID]).
    where('kerberos = ?', [kerberos]);
  this.db.execute(function(err, res) {
    callback(false);
  });
}

// UPC database functions

Checkout.prototype.getUPCItem = function(barcode, callback) {
  // Key for UPC lookup database
  // upcdatabase.org, sparkyroombot login credentials
  request('http://api.upcdatabase.org/json/534ec547b0800b428470cf62b158388e/' + barcode,
    function(error, response, body) {
      if (error || response.statusCode != 200) {
        callback(barcode, false);
      } else {
        var result = JSON.parse(body);
        if (!result.valid) {
          callback(barcode, false);
        } else {
          callback(barcode, result.description);
        }
      }
    });
  };

  // Get checkout duration for a list of items. Also sets overdue variable
  // to false if item is not overdue or true if item is overdue
  Checkout.prototype.getCheckoutDuration = function(itemList) {
    var dayLength = 24*60*60*1000;
    for (var i = 0; i < itemList.length; ++i) {
      timeBorrowed = itemList[i].timeBorrowed;
      if (timeBorrowed !== '0') {
        var now = new Date().getTime();
        itemList[i].daydiff = Math.floor((now - timeBorrowed)/dayLength);
      }
      if (itemList[i].daydiff > 3) {
        itemList[i].overdue = true;
      } else {
        itemList[i].overdue = false;
      }
    }
    return itemList;
  };

  Checkout.prototype.getOverdueItems = function(callback) {
    var thisObj = this;
    thisObj.getAllCheckedOutItems(function(itemList) {
      thisObj.getCheckoutDuration(itemList);
      userOverdueItems = {};
      for (var i = 0; i < itemList.length; ++i) {
        if (!itemList[i].overdue)
          continue;
        borrower = itemList[i].borrower;
        if (userOverdueItems[borrower] === undefined) {
          userOverdueItems[borrower] = [];
        }
        userOverdueItems[borrower].push(itemList[i]);
      }
      callback(userOverdueItems);
    });
  }

module.exports = Checkout;
