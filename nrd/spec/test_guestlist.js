var util = require('./util');
var db = require('../models/db').Database;
var Users = require('../models/user').Users;
var GuestLists = require('../models/guestlist').GuestLists;

var test = util.test;
var testObj = util.testObj;

util.runFunctions([
    function(done) {
      db.execute('DROP TABLE IF EXISTS `next-users`', done);
    },
    function(done) {
      db.execute('CREATE TABLE IF NOT EXISTS `next-users` (' +
          '`id` int(11) NOT NULL AUTO_INCREMENT,' +
          '`kerberos` varchar(8) NOT NULL,' +
          '`firstName` varchar(255) DEFAULT NULL,' +
          '`lastName` varchar(255) DEFAULT NULL,' +
          '`roomNumber` int(4) DEFAULT NULL,' +
          '`email` varchar(255) DEFAULT NULL,' +
          '`mitID` int(11) DEFAULT NULL,' +
          '`password` text NOT NULL,' +
          '`group` int(11) NOT NULL,' +
          'PRIMARY KEY (`id`),' +
          'UNIQUE KEY `kerberos` (`kerberos`)' +
          ') ENGINE=MyISAM DEFAULT CHARSET=latin1', done)
    },
    function(done) {
      db.execute('DROP TABLE IF EXISTS `next-guestlist`', done);
    },
    function(done) {
      db.execute('CREATE TABLE IF NOT EXISTS `next-guestlist` (' +
            '`id` int(11) NOT NULL AUTO_INCREMENT,' +
            '`userID` int(11) NOT NULL,' +
            '`guest1Name` varchar(255) NOT NULL,' +
            '`guest1Kerberos` varchar(8) NOT NULL,' +
            '`guest2Name` varchar(255) NOT NULL,' +
            '`guest2Kerberos` varchar(8) NOT NULL,' +
            '`guest3Name` varchar(255) NOT NULL,' +
            '`guest3Kerberos` varchar(8) NOT NULL,' +
            '`guest4Name` varchar(255) NOT NULL,' +
            '`guest4Kerberos` varchar(8) NOT NULL,' +
            '`guest5Name` varchar(255) NOT NULL,' +
            '`guest5Kerberos` varchar(8) NOT NULL,' +
            '`guest6Name` varchar(255) NOT NULL,' +
            '`guest6Kerberos` varchar(8) NOT NULL,' +
            '`guest7Name` varchar(255) NOT NULL,' +
            '`guest7Kerberos` varchar(8) NOT NULL,' +
            '`guest8Name` varchar(255) NOT NULL,' +
            '`guest8Kerberos` varchar(8) NOT NULL,' +
            '`guest9Name` varchar(255) NOT NULL,' +
            '`guest9Kerberos` varchar(8) NOT NULL,' +
            '`guest10Name` varchar(255) NOT NULL,' +
            '`guest10Kerberos` varchar(8) NOT NULL,' +
            'PRIMARY KEY (`id`)' +
            ') ENGINE=MyISAM DEFAULT CHARSET=latin1', done);
    },
    function(done) {
      GuestLists.listGuests({}, function(err, guestlists) {
        test(guestlists.length === 0);
        done();
      });
    },
    function(done) {
      Users.createUser('kyc2915', function(err) {
        Users.createUser('victor', function(err) {
          Users.createUser('rliu42', done);
        });
      });
    },
    function(done) {
      var users = ['kyc2915', 'victor', 'rliu42'];
      GuestLists.listGuests({}, function(err, guestlists) {
        test(guestlists.length === 3);
        for (var i = 0; i < 3; i++) {
          for (var j = 1; j <= 10; j++) {
            test(guestlists[i].kerberos === users[i]);
            test(!guestlists[i]['guest' + j + 'Name']);
            test(!guestlists[i]['guest' + j + 'Kerberos']);
          }
        }
        done();
      });
    },
    function(done) {
      GuestLists.getGuestList(1, function(err, guestlist) {  // kyc2915
        guestlist.updateGuests({
          guest1Name: 'Becky Shi',
          guest1Kerberos: 'beckyshi'
        }, done);
      });
    },
    function(done) {
      GuestLists.getGuestList(1, function(err, guestlist) {
        test(guestlist.userID === 1);
        test(guestlist.guest1Name === 'Becky Shi');
        test(guestlist.guest1Kerberos === 'beckyshi');
        test(!guestlist.guest2Name);
        test(!guestlist.guest2Kerberos);
        done();
      });
    },
    function(done) {
      // test multiple guest updates
      GuestLists.getGuestList(2, function(err, guestlist) {  // victor
        guestlist.updateGuests({
          guest1Name: 'Stephanie Yu',
          guest1Kerberos: 'styu',
          guest2Name: 'Norman Cao',
          guest2Kerberos: 'normandy'
        }, done);
      });
    },
    function(done) {
      GuestLists.getGuestList(2, function(err, guestlist) {
        test(guestlist.userID === 2);
        test(guestlist.guest1Name === 'Stephanie Yu');
        test(guestlist.guest1Kerberos === 'styu');
        test(guestlist.guest2Name === 'Norman Cao');
        test(guestlist.guest2Kerberos === 'normandy');
        done();
      });
    },
    function(done) {
      // test out of order guest updates
      GuestLists.getGuestList(3, function(err, guestlist) {  // rliu42
        guestlist.updateGuests({
          guest2Name: 'Bobby Shen',
          guest2Kerberos: 'runbobby'
        }, done);
      });
    },
    function(done) {
      GuestLists.getGuestList(3, function(err, guestlist) {
        test(guestlist.userID === 3);
        test(!guestlist.guest1Name);
        test(!guestlist.guest1Kerberos);
        test(guestlist.guest2Name === 'Bobby Shen');
        test(guestlist.guest2Kerberos === 'runbobby');
        done();
      });
    },
    function(done) {
      // test search patterns
      GuestLists.listGuests({hostSearchPattern: 'kyc'}, function(err, results) {
        test(results.length === 1);
        test(results[0].kerberos === 'kyc2915');
        test(results[0].guest1Name === 'Becky Shi');
        test(results[0].guest1Kerberos === 'beckyshi');
        done();
      });
    },
    function(done) {
      // test search patterns
      GuestLists.listGuests({hostSearchPattern: 'Chen'}, function(err, results) {
        test(results.length === 1);
        test(results[0].kerberos === 'kyc2915');
        test(results[0].guest1Name === 'Becky Shi');
        test(results[0].guest1Kerberos === 'beckyshi');
        done();
      });
    },
    function(done) {
      GuestLists.listGuests({hostSearchPattern: 'r', sortBy: 'kerberos'},
          function(err, results) {
        test(results.length === 2);
        test(results[0].kerberos === 'rliu42');
        test(results[0].guest2Name === 'Bobby Shen');
        test(results[0].guest2Kerberos === 'runbobby');
        test(results[1].kerberos === 'victor');
        test(results[1].guest1Name === 'Stephanie Yu');
        test(results[1].guest1Kerberos === 'styu');
        test(results[1].guest2Name === 'Norman Cao');
        test(results[1].guest2Kerberos === 'normandy');
        done();
      });
    },
    function(done) {
      GuestLists.listGuests({guestSearchPattern: 'run'},
          function(err, results) {
        test(results.length === 1);
        test(results[0].kerberos === 'rliu42');
        test(results[0].guest2Name === 'Bobby Shen');
        test(results[0].guest2Kerberos === 'runbobby');
        done();
      });
    },
    function(done) {
      // Check updating a guest with null value
      GuestLists.getGuestListOfUser(1, function(err, guestlist) {  // kyc2915
        guestlist.updateGuests({
          guest1Name: '',
          guest1Kerberos: ''
        }, done);
      });
    },
    function(done) {
      GuestLists.getGuestListOfUser(1, function(err, guestlist) {  // kyc2915
        test(guestlist.guest1Name === '');
        test(guestlist.guest1Kerberos === '');
        done();
      });
    },
    function(done) {
      // test getGuestListOfUser
      // first insert user and guestlist with different IDs
      db.execute("INSERT INTO `next-users` (id, kerberos) VALUES (5, 'test1')", done);
    },
    function(done) {
      db.execute("INSERT INTO `next-guestlist`" +
          "(id, userID, guest1Name, guest1Kerberos)" +
          "VALUES (6, 5, 'guest', 'guest')", done);
    },
    function(done) {
      GuestLists.getGuestListOfUser(5, function(err, guestlist) {
        test(guestlist.userID === 5);
        test(guestlist.guest1Name === 'guest');
        test(guestlist.guest1Kerberos === 'guest');
        done();
      });
    },
    function(done) {
      GuestLists.getGuestListOfUser(6, function(err, guestlist) {
        test(err);
        done();
      });
    },
    function(done) {
      // Test duplicate guest finder
      GuestLists.findRepeatedGuests({
        guest1Kerberos: 'styu',
        guest2Kerberos: 'runbobby',
        guest3Kerberos: 'other'
      }, {kerberos: 'kyc2915'}, function(err, repeatedGuests) {
        test(repeatedGuests.length === 2);
        test(repeatedGuests[0].guest === 'styu');
        test(repeatedGuests[0].host.kerberos === 'victor');
        test(repeatedGuests[1].guest === 'runbobby');
        test(repeatedGuests[1].host.kerberos === 'rliu42');
        done();
      });
    },
    function(done) {
      // Test not getting own guest list
      GuestLists.findRepeatedGuests({
        guest1Kerberos: 'styu',
        guest2Kerberos: 'runbobby',
      }, {kerberos: 'victor'}, function(err, repeatedGuests) {
        test(repeatedGuests.length === 1);
        test(repeatedGuests[0].guest === 'runbobby');
        test(repeatedGuests[0].host.kerberos === 'rliu42');
        done();
      });
    },
    function(done) {
      GuestLists.findRepeatedGuests({}, {kerberos: 'kyc2915'},
        function(err, repeatedGuests) {
          test(!err && repeatedGuests.length === 0);
          done();
        });
    }]);
