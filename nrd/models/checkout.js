/*
 * ITEM CHECKOUT SYSTEM API
 *
 * An Item object contains the following fields:
 *      id: unique int id
 *      barcode: barcode of checked out item
 *      name: name of checked out item
 *      timeAdded (datetime): time (milliseconds) that the item was added to the database
 *      borrower (string): kerberos currently checked out to, or empty string
 *      timeBorrowed (int): time (milliseconds) that the borrower checked out the item
 *      deskworker (string): kerberos of deskworker who last checkout out/in the item
 *
 * e.g. {id: 1, barcode: 12345, name: 'Ping Pong Paddle',
 *      timeAdded: 123456789, borrower: 'kyc2915',
 *      timeBorrowed: 123456987', deskworker: 'jake'}
 */

var request = require('request');
var db = require('./db').Database;
var logger = require('./logger');

const DAY_LENGTH = 24 * 60 * 60 * 1000;
const MAX_CHECKOUT_LENGTH = 3;  // days
const UPC_DATABASE_URL = (
    'https://api.semantics3.com/v1/products');
const UPC_API_KEY = 'SEM34857CE5768677843A55996BFCAEECF3D';
const UPC_API_SECRET = 'NmZmMDMwMjVhZTZhMzZlODZhZWQ5OTdhMzI1ODk5Njc';

var Checkout = function() {
  var that = Object.create(Checkout.prototype);
  Object.freeze(that);
  return that;
};

var Item = function(item) {
  this.id = item.id;
  this.barcode = item.barcode;
  this.name = item.name;
  this.timeAdded = item.timeAdded;
  this.borrower = item.borrower;
  this.timeBorrowed = item.timeBorrowed;
  this.deskworker = item.deskworker;
  this.getCheckoutDuration();
};

// Convenience function for SELECT with where, sort, and limit clauses
function get(params, callback) {
  var query = db.query().select(['*']).from('next-checkout-items');
  if (params.whereClause) {
    query = query.where(params.whereClause, params.whereArgs);
  }
  if (params.sortBy) {
    if (params.isDesc) {
      query = query.orderByDesc(params.sortBy);
    } else {
      query = query.orderBy(params.sortBy);
    }
  }
  if (params.limit) {
    query = query.limit(params.limit);
  }
  query.execute(function(err, rows) {
    if (err) {
      callback(err);
    } else {
      for (var i = 0; i < rows.length; i++) {
        rows[i] = new Item(rows[i]);
      }
      callback(err, rows);
    }
  });
}

/******************************************************************************
 *
 * READ FUNCTIONS
 *
 ******************************************************************************/

/*
 * Returns a list of all Items
 */
Checkout.prototype.getAllItems = function(callback) {
  get({}, callback);
};

/*
 * Returns a list of all reserved items (borrower not null)
 */
Checkout.prototype.getReservedItems = function(callback) {
  get({whereClause: 'borrower != ?', whereArgs: ['']}, callback);
};

/*
 * Returns a list of all unreserved items (borrower is null)
 */
Checkout.prototype.getUnreservedItems = function(callback) {
  get({whereClause: 'borrower = ?', whereArgs: ['']}, callback);
};

/*
 * Returns the Item with the given barcode, or false if nonexistent
 */
Checkout.prototype.getItemWithBarcode = function(barcode, callback) {
  get({whereClause: 'barcode = ?', whereArgs: [barcode]},
      function(err, items) {
        if (err) {
          callback(err);
        } else if (items.length == 0) {
          callback('No item found.');
        } else {
          callback(false, items[0]);
        }
      });
};

/*
 * Returns a list of Items checked out by the user with the given kerberos
 */
Checkout.prototype.getCheckedOutItems = function(kerberos, callback) {
  get({whereClause: 'borrower = ?', whereArgs: [kerberos]}, callback);
};

/*
 * Returns a list of Items checked out after the specified time
 * (Javascript Date object)
 */
Checkout.prototype.getRecentlyCheckedOutItems = function(time, callback) {
  get({whereClause: 'borrower != ? && timeBorrowed > ?',
    whereArgs: ['', time], sortBy: 'timeBorrowed', isDesc: true}, callback);
};

/*
 * Returns a list of most recent Items added (returns up to [limit] rows)
 */
Checkout.prototype.getRecentlyAddedItems = function(limit, callback) {
  get({sortBy: 'timeBorrowed', isDesc: true, limit: limit}, callback);
};

/*
 * Returns a list of Items whose name contains the specified substring
 */
Checkout.prototype.searchItems = function(pattern, callback) {
  get({whereClause: 'name LIKE ?', whereArgs: ['%' + pattern + '%']},
      callback);
};

/*
 * Returns the description of an object given its barcode,
 *   using the UPC lookup database.
 * callback(err, description), where err = true if the object does not exist
 *   in the UPC database.
 */
Checkout.prototype.getUPCItem = function(barcode, callback) {
  // Key for UPC lookup database at semantics3.com
  // use sparkyroombot login credentials
  var options = {
    oauth: {
      consumer_key: UPC_API_KEY,
      consumer_secret: UPC_API_SECRET
    },
    url: UPC_DATABASE_URL,
    qs: {
      q: '{"upc":"' + barcode + '"}'
    }
  };
  request(options, function(err, response, body) {
    if (err) {
      callback(err);
    } else if (response.statusCode != 200) {
      callback('Item not found');
    } else {
      var result = JSON.parse(body);
      if (result.code !== "OK" || result.results_count < 1) {
        callback('Item not found');
      } else {
        callback(false, result.results && result.results.length 
                  && result.results[0].name);
      }
    }
  });
};


/******************************************************************************
 *
 * EDIT FUNCTIONS
 *
 ******************************************************************************/

/*
 * Adds a new Item with the given barcode and name
 *   to the list of items that can be reserved.
 * now is a Javascript date time representing the current time.
 */
Checkout.prototype.addItem = function(barcode, name, now, callback) {
  db.query().insert('next-checkout-items',
        ['barcode', 'name', 'timeAdded'], [barcode, name, now]).execute(callback);
};

/*
 * Returns a map from each user kerberos to a list of all overdue Items
 */
Checkout.prototype.getOverdueItems = function(callback) {
  var thisObj = this;
  thisObj.getReservedItems(function(err, itemList) {
    userOverdueItems = {};
    for (var i = 0; i < itemList.length; ++i) {
      if (!itemList[i].overdue) {
        continue;
      }
      borrower = itemList[i].borrower;
      if (userOverdueItems[borrower] === undefined) {
        userOverdueItems[borrower] = [];
      }
      userOverdueItems[borrower].push(itemList[i]);
    }
    callback(false, userOverdueItems);
  });
};

/******************************************************************************
 *
 * OBJECT FUNCTIONS (must be called on a Item object)
 *
 ******************************************************************************/

/*
 * Gets checkout duration information for this item.
 */
Item.prototype.getCheckoutDuration = function() {
  if (this.timeBorrowed != 0) {
    this.daydiff = Math.floor((new Date().getTime()
          - this.timeBorrowed) / DAY_LENGTH);
    this.overdue = this.daydiff > MAX_CHECKOUT_LENGTH;
  } else {
    this.daydiff = this.overdue = null;
  }
};

/*
 * Checks out this Item
 * now is a Javascript date time representing the current time.
 */
Item.prototype.checkout = function(kerberos, deskworker, now, callback) {
  this.borrower = kerberos;
  this.timeBorrowed = now;
  this.deskworker = deskworker;
  this.getCheckoutDuration();
  db.query().update('next-checkout-items',
      ['borrower', 'timeBorrowed', 'deskworker'], [kerberos, now, deskworker])
    .where('id = ?', [this.id]).execute(callback);
};

/*
 * Checks in this Item
 */
Item.prototype.checkin = function(deskworker, callback) {
  this.borrower = '';
  this.timeBorrowed = 0;
  this.deskworker = deskworker;
  this.getCheckoutDuration();
  db.query().update('next-checkout-items',
      ['borrower', 'timeBorrowed', 'deskworker'], ['', 0, deskworker])
    .where('id = ?', [this.id]).execute(callback);
};

/*
 * Removes this Item from the list
 */
Item.prototype.remove = function(callback) {
  db.query().deleteFrom('next-checkout-items')
    .where('id = ?', [this.id]).execute(callback);
};

module.exports.Checkout = new Checkout();
