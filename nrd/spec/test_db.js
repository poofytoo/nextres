var util = require('./util');
var db = require('../models/db').Database;

var test = util.test;
var testObj = util.testObj;

util.runFunctions([
    function(done) {
      db.execute('DROP TABLE IF EXISTS `db-users`', done);
    },
    function(done) {
      db.execute('CREATE TABLE IF NOT EXISTS `db-users` (' +
          '`id` int(11) NOT NULL AUTO_INCREMENT,' +
          '`name` varchar(255) NOT NULL,' +
          'PRIMARY KEY (`id`)' +
          ') ENGINE=MyISAM DEFAULT CHARSET=latin1', done);
    },
    function(done) {
      db.execute('DROP TABLE IF EXISTS `db-guests`', done);
    },
    function(done) {
      db.execute('CREATE TABLE IF NOT EXISTS `db-guests` (' +
          '`id` int(11) NOT NULL AUTO_INCREMENT,' +
          '`guest` varchar(255) NOT NULL,' +
          'PRIMARY KEY (`id`)' +
          ') ENGINE=MyISAM DEFAULT CHARSET=latin1', done);
    },
    function(done) {
      db.query().select(['name']).from('db-users')
        .execute(function(err, rows) {
          test(rows.length === 0);
          done();
        });
    },
    function(done) {
      db.query().insert('db-users', ['id', 'name'], [1, 'kyc']).execute(done);
    },
    function(done) {
      db.query().select(['name']).from('db-users')
        .execute(function(err, rows) {
          test(rows.length === 1);
          testObj(rows[0], {name: 'kyc'});
          done();
        });
    },
    function(done) {
      db.query().update('db-users', ['name'], ['vhung']).execute(done);
    },
    function(done) {
      db.query().select(['*']).from('db-users')
        .execute(function(err, rows) {
          test(rows.length === 1);
          testObj(rows[0], {id: 1, name: 'vhung'});
          done();
        });
    },
    function(done) {
      db.query().deleteFrom('db-users').where('id = ?', [1]).execute(done);
    },
    function(done) {
      db.query().select(['*'])
        .from('db-users')
        .execute(function(err, rows) {
          test(rows.length === 0);
          done();
        });
    },
    function(done) {
      db.execute('INSERT INTO `db-users` (`id`, `name`) VALUES' +
          "(2, 'ben')," +
          "(3, 'normandy')," +
          "(4, 'runpeng')," +
          "(5, 'steph')," +
          "(7, 'lauren')", done);
    },
    function(done) {
      db.execute('INSERT INTO `db-guests` (`id`, `guest`) VALUES' +
          "(2, 'ben-guest')," +
          "(3, 'normandy-guest')," +
          "(4, 'runpeng-guest')", done);
    },
    function(done) {
      db.query().select(['id']).from('db-users')
        .where('name LIKE ?', ['%en%'])
        .execute(function(err, rows) {
          test(rows.length === 3);
          test(rows[0].id === 2);
          test(rows[1].id === 4);
          test(rows[2].id === 7);
          done();
        });
    },
    function(done) {
      db.query().select(['id']).from('db-users').limit(4)
        .execute(function(err, rows) {
          test(rows.length === 4);
          done();
        });
    },
    function(done) {
      db.query().select(['id']).from('db-users')
          .orderBy('name')
          .execute(function(err, rows) {
            test(rows[0].id === 2);
            test(rows[1].id === 7);
            test(rows[2].id === 3);
            test(rows[3].id === 4);
            test(rows[4].id === 5);
            done();
          });
    },
    function(done) {
      db.query().select(['id']).from('db-users')
          .orderByDesc('name')
          .execute(function(err, rows) {
            test(rows[0].id === 5);
            test(rows[1].id === 4);
            test(rows[2].id === 3);
            test(rows[3].id === 7);
            test(rows[4].id === 2);
            done();
          });
    },
    function(done) {
      db.query().select(['name', 'guest']).from('db-users')
        .leftJoin('db-guests')
        .on('`db-users`.id = `db-guests`.id')
        .execute(function(err, rows) {
          test(rows.length === 5);
          testObj(rows[0], {name: 'ben', guest: 'ben-guest'});
          testObj(rows[1], {name: 'normandy', guest: 'normandy-guest'});
          testObj(rows[2], {name: 'runpeng', guest: 'runpeng-guest'});
          testObj(rows[3], {name: 'steph', guest: null});
          testObj(rows[4], {name: 'lauren', guest: null});
          done();
        });
    },
    function(done) {
      db.query().select(['name', 'guest']).from('db-users')
        .rightJoin('db-guests')
        .on('`db-users`.id = `db-guests`.id')
        .execute(function(err, rows) {
          test(rows.length === 3);
          testObj(rows[0], {name: 'ben', guest: 'ben-guest'});
          testObj(rows[1], {name: 'normandy', guest: 'normandy-guest'});
          testObj(rows[2], {name: 'runpeng', guest: 'runpeng-guest'});
          done();
        });
    },
    function(done) {
      db.query().select(['*']).from('db-users')
        .leftJoin('db-guests')
        .on('`db-users`.id = `db-guests`.id')
        .where('name LIKE ?', ['%en%'])
        .limit(2)
        .execute(function(err, rows) {
          test(rows.length === 2);
          test(rows[0].id === 2);
          test(rows[1].id === 4);
          done();
        });
    }]);

