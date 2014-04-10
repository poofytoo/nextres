var util = require('./util');
var db = require('../models/db').Database;
var Checkout = require('../models/checkout').Checkout;

var test = util.test;
var testObj = util.testObj;

util.runFunctions([
    function(done) {
      db.execute('DROP TABLE IF EXISTS `next-checkout-items`', done);
    },
    function(done) {
      db.execute('CREATE TABLE IF NOT EXISTS `next-checkout-items` (' +
          '`id` int(11) NOT NULL AUTO_INCREMENT,' +
          '`barcode` bigint(11) NOT NULL,' +
          '`name` varchar(255) NOT NULL,' +
          '`timeAdded` bigint(11) NOT NULL,' +
          '`borrower` varchar(16) NOT NULL,' +
          '`timeBorrowed` bigint(11) NOT NULL,' +
          '`deskworker` varchar(32) NOT NULL,' +
          'PRIMARY KEY (`id`),' +
          'UNIQUE KEY `barcode` (`barcode`)' +
          ') ENGINE=MyISAM DEFAULT CHARSET=latin1', done)
    },
    function(done) {
      // table is initially empty
      Checkout.getAllItems(function(err, items) {
        test(items.length === 0);
        done();
      });
    },
    function(done) {
      Checkout.addItem('12345', 'Back to the Future', '1', done);
    },
    function(done) {
      Checkout.addItem('54321', 'Ping Pong Paddle', '2', done);
    },
    function(done) {
      Checkout.addItem('56789', 'Om Nom', '4', done);
    },
    function(done) {
      Checkout.getAllItems(function(err, items) {
        test(items.length === 3);
        test(items[0].barcode === '12345');
        test(items[0].name === 'Back to the Future');
        test(items[0].timeAdded === '1');
        done();
      });
    },
    function(done) {
      Checkout.getItemWithBarcode('12345', function(err, item) {
        item.checkout('kyc2915', 'jake', '5', done);
      });
    },
    function(done) {
      Checkout.getReservedItems(function(err, items) {
        test(items.length === 1);
        test(items[0].barcode === '12345');
        done();
      });
    },
    function(done) {
      Checkout.getUnreservedItems(function(err, items) {
        test(items.length === 2);
        test(items[0].name === 'Ping Pong Paddle');
        test(items[1].name === 'Om Nom');
        done();
      });
    },
    function(done) {
      Checkout.getItemWithBarcode('56789', function(err, item) {  // Om Nom
        item.checkout('vhung', 'brian', '9', done);
      });
    },
    function(done) {
      // Check out some more things
      Checkout.getItemWithBarcode('54321', function(err, item) {  // Ping Pong
        item.checkout('kyc2915', 'brian', '11', done);
      });
    },
    function(done) {
      Checkout.getCheckedOutItems('kyc2915', function(err, items) {
        test(items.length === 2);
        test(items[0].name === 'Back to the Future');
        test(items[1].name === 'Ping Pong Paddle');
        done();
      });
    },
    function(done) {
      // Check that this only shows items checked out after time 8.
      Checkout.getRecentlyCheckedOutItems(8, function(err, items) {
        test(items.length === 2);
        test(items[0].name === 'Ping Pong Paddle');
        test(items[1].name === 'Om Nom');
        done();
      });
    },
    function(done) {
      Checkout.getRecentlyAddedItems(2, function(err, items) {
        test(items.length === 2);
        test(items[0].name === 'Ping Pong Paddle');
        test(items[1].name === 'Om Nom');
        done();
      });
    },
    function(done) {
      Checkout.searchItems('Pong', function(err, items) {
        test(items.length === 1);
        test(items[0].name === 'Ping Pong Paddle');
        done();
      });
    },
    function(done) {
      // Test UPC database for barcode '1'
      Checkout.getUPCItem(1, function(err, description) {
        test(description, 'UPC database lookup failed');
        test(description === 'Lysol All Purpose Cleaner');
        done();
      });
    },
    function(done) {
      // Now check some items back in
      Checkout.getRecentlyCheckedOutItems(8, function(err, items) {
        items[0].checkin('joe', function(err) {
          items[1].checkin('joe', function(err2) {
            test(!err && !err2);
            done();
          });
        });
      });
    },
    function(done) {
      Checkout.getRecentlyCheckedOutItems(8, function(err, items) {
        test(items.length === 0);
        done();
      });
    },
    function(done) {
      Checkout.getReservedItems(function(err, items) {
        test(items.length === 1);
        test(items[0].name === 'Back to the Future');
        done();
      });
    },
    function(done) {
      // Test removing Back to the Future
      Checkout.getItemWithBarcode('12345', function(err, item) {
        item.remove(done);
      });
    },
    function(done) {
      Checkout.getAllItems(function(err, items) {
        test(items.length === 2);
        test(items[0].name === 'Ping Pong Paddle');
        test(items[1].name === 'Om Nom');
        done();
      });
    }]);
