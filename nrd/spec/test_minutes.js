var util = require('./util');  // MUST BE FIRST LINE
var fs = require('fs');
var db = require('../models/db').Database;
var Minutes = require('../models/minutes').Minutes;

var test = util.test;
var testObj = util.testObj;

// Generate random minutes data so that we don't accidentally
//   check data from a previous test run
var random1 = Math.random().toString(36);
var random2 = Math.random().toString(36);
var random3 = Math.random().toString(36);

function dayToString(year, month, day) {
  return new Date(Date.UTC(year, month, day)).toUTCString();
}

util.runFunctions([
    function(done) {
      db.execute('DROP TABLE IF EXISTS `next-minutes`', done);
    },
    function(done) {
      db.execute('CREATE TABLE IF NOT EXISTS `next-minutes` (' +
          '`id` int(11) NOT NULL AUTO_INCREMENT,' +
          '`name` varchar(255) NOT NULL,' +
          '`date` date NOT NULL,' +
          '`path` varchar(255) NOT NULL,' +
          'PRIMARY KEY (`id`)' +
          ') ENGINE=MyISAM DEFAULT CHARSET=latin1', done)
    },
    function(done) {
      Minutes.getMinutes({}, function(err, minutes) {
        test(minutes.length === 0);
        done();
      });
    },
    function(done) {
      fs.writeFile('tmp', random1, function(err) {
        Minutes.addMinute('minute1', '2014-04-01', {name: 'minute1.pdf', path: 'tmp'}, done);
      });
    },
    function(done) {
      fs.writeFile('tmp', random2, function(err) {
        Minutes.addMinute('minute2', '2014-04-02', {name: 'minute2.pdf', path: 'tmp'}, done);
      });
    },
    function(done) {
      fs.writeFile('tmp', random3, function(err) {
        Minutes.addMinute('minute3', '2014-04-03', {name: 'minute3.pdf', path: 'tmp'}, done);
      });
    },
    function(done) {
      // Remove temporary file
      fs.unlink('tmp', done);
    },
    function(done) {
      Minutes.getMinute(1, function(err, minute) {
        test(minute.name === 'minute1');
        test(minute.date == dayToString(2014, 3, 1));
        fs.readFile(minute.path, function(err, data) {
          test(data == random1);
          done();
        });
      });
    },
    function(done) {
      Minutes.getMinute(2, function(err, minute) {
        minute.remove(done);
      });
    },
    function(done) {
      Minutes.getMinutes({}, function(err, minutes) {
        test(minutes.length === 2);
        test(minutes[0].name === 'minute1');
        test(minutes[0].date === dayToString(2014, 3, 1));
        test(minutes[1].name === 'minute3');
        test(minutes[1].date === dayToString(2014, 3, 3));
        fs.readFile(minutes[1].path, function(err, data) {
          test(data == random3);
          done();
        });
      });
    },
    function(done) {
      // no uploaded file exists should give error
      Minutes.addMinute('err', new Date(), {name: 'err', path: 'nonexistent'},
          function(err) {
            test(err);
            done();
          });
    }]);
