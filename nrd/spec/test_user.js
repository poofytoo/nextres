var util = require('./util');  // MUST BE FIRST LINE
var db = require('../models/db').Database;
var Users = require('../models/user').Users;

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
            'PRIMARY KEY (`id`)' +
            ') ENGINE=MyISAM DEFAULT CHARSET=latin1', done);
    },
    function(done) {
      Users.findAll({}, function(err, users) {
        test(users.length === 0);
        done();
      });
    },
    function(done) {
      Users.createUser('nonexist', done);
    },
    function(done) {
      Users.findById(1, function(err, user) {
        test(user.kerberos === 'nonexist');
        test(!user.firstName);
        test(!user.lastName);
        test(!user.roomNumber);
        test(user.group === 0);
        done();
      });
    },
    function(done) {
      Users.createUsers(['kyc2915', 'rliu42'], done);
    },
    function(done) {
      Users.findAll({sortBy: 'firstName'}, function(err, users) {
        test(users.length === 3);
        test(users[1].kerberos === 'kyc2915');
        test(users[1].firstName === 'Kevin');
        test(users[1].lastName === 'Chen');
        test(users[1].roomNumber === 310);
        test(users[1].group === 0);
        test(users[2].kerberos === 'rliu42');
        test(users[2].firstName === 'Runpeng');
        test(users[2].lastName === 'Liu');
        test(users[2].roomNumber === 305);
        test(users[2].group === 0);
        done();
      });
    },
    function(done) {
      Users.createUser('too_long_', function(err) {
        test(err);
        done();
      });
    },
    function(done) {
      Users.findById(1, function(err, user) {  // nonexist
        user.updateProfile('Bobby', 'Jones', 100, done);
      });
    },
    function(done) {
      Users.findById(1, function(err, user) {
        test(user.kerberos === 'nonexist');
        test(user.firstName === 'Bobby');
        test(user.lastName === 'Jones');
        test(user.roomNumber === 100);
        done();
      });
    },
    function(done) {
      Users.findById(2, function(err, user) {  // kyc2915
        user.editMitID(123456789, done);
      });
    },
    function(done) {
      Users.findById(2, function(err, user) {
        test(user.kerberos === 'kyc2915');
        test(user.mitID === 123456789);
        done();
      });
    },
    function(done) {
      Users.findById(3, function(err, user) {  // rliu42
        var origPassword = user.password;
        user.changePassword('secret', function(err) {
          test(!err);
          Users.findById(3, function(err, user) {
            test(user.kerberos === 'rliu42');
            test(user.password !== origPassword);
            done();
          });
        });
      });
    },
    function(done) {
      Users.findByKerberos('nonexist', function(err, user) {
        var origPassword = user.password;
        user.resetPassword(function(err) {
          test(!err);
          Users.findByKerberos('nonexist', function(err, user) {
            test(user.kerberos === 'nonexist');
            test(user.password !== origPassword);
            done();
          });
        });
      });
    },
    function(done) {
      // Test searching users by kerberos
      Users.findAll({'kerberosSearchPattern': '2'}, function(err, users) {
        test(users.length === 2);
        test(users[0].kerberos === 'kyc2915');
        test(users[1].kerberos === 'rliu42');
        done();
      });
    },
    function(done) {
      Users.findByKerberos('kyc2915', function(err, user) {
        user.changeGroup(1, done);
      });
    },
    function(done) {
      Users.findByKerberos('kyc2915', function(err, user) {
        test(user.kerberos === 'kyc2915');
        test(user.group === 1);
        done();
      });
    },
    function(done) {
      Users.findByKerberos('rliu42', function(err, user) {
        user.remove(done);
      });
    },
    function(done) {
      Users.findAll({}, function(err, users) {
        test(users.length === 2);
        done();
      });
    },
    function(done) {
      Users.findById(-1, function(err) {
        test(err);
        done();
      });
    },
    function(done) {
      Users.findById('not_here', function(err) {
        test(err);
        done();
      });
    },

    function(done) {
      // Check getProfile() from mitdir
      Users.getProfile('kyc2915', function(err, profile) {
        test(!err, 'getProfile() failed: is finger installed?');
        test(profile.lastName);
        test(profile.year);
        done();
      });
    }]);
