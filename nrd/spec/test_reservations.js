var util = require('./util');
var Reservations = require('../models/reservations').Reservations;

var test = util.test;
var testObj = util.testObj;

var now = new Date('2014-03-24');  // make current time consistent

util.runFunctions([
    function(done) {
      // Calendar initially empty
      Reservations.getReservations(now, function(err, reservations) {
        test(!err && reservations.length === 0, 'Calendar not initially empty');
        done();
      });
    },
    function(done) {
      // Basic reservation
      Reservations.reserve({
        signatory1: 'kyc2915',
        signatory2: 'beckyshi',
        date: '2014-04-01',
        start: '8:00pm',
        end: '11:00pm',
        room: 'Country Kitchen',
        reason: 'Cooking things'
      }, done);
    },
    function(done) {
      Reservations.getReservations(now, function(err, reservations) {
        test(reservations.length === 1);
        test(reservations[0].start.dateTime === '2014-04-01T20:00:00-04:00');
        test(reservations[0].end.dateTime === '2014-04-01T23:00:00-04:00');
        test(reservations[0].location === 'Country Kitchen');
        test(reservations[0].description === 'Cooking things');
        test(reservations[0].summary === 'Country Kitchen - kyc2915');
        test(reservations[0].status === 'tentative');
        test(reservations[0].attendees[0].email === 'beckyshi@mit.edu');
        test(reservations[0].attendees[1].email === 'kyc2915@mit.edu');
        done();
      });
    },
    function(done) {
      // Add other reservations
      Reservations.reserve({
        signatory1: 'vhung',
        signatory2: 'normandy',
        date: '2014-04-02',
        start: '1:00am',
        end: '4:00am',
        room: 'Courtyard & BBQ Pits',
        reason: 'Midnight building'
      }, done);
    },
    function(done) {
      Reservations.reserve({
        signatory1: 'rliu42',
        signatory2: 'bmatt',
        signatory3: 'lahuang4',
        date: '2014-03-31',
        start: '4:00pm',
        end: '12:00am',
        room: 'Conference Room',
        reason: 'Freshmen party'
      }, done);
    },
    function(done) {
      Reservations.getReservations(now, function(err, reservations) {
        // check that reservations are in order from most to least recent
        test(reservations.length === 3);
        test(reservations[0].summary === 'Country Kitchen - kyc2915');
        test(reservations[1].summary === 'Courtyard & BBQ Pits - vhung');
        test(reservations[2].summary === 'Conference Room - rliu42');
        done();
      });
    },
    function(done) {
      Reservations.getReservationsWithUser(now, {email: 'kyc2915@mit.edu'},
          function(err, reservations) {
            test(reservations.length === 1);
            test(reservations[0].summary === 'Country Kitchen - kyc2915');
            done();
          });
    },
    function(done) {
      // Prevent room conflicts
      Reservations.reserve({
        signatory1: 'hacker',
        date: '2014-03-31',
        start: '5:00pm',
        end: '8:00pm',
        room: 'Conference Room',
        reason: 'crash the freshmen party'
      }, function(err) {
        test(err);
        done();
      });
    },
    function(done) {
      // Allow room reservations that are adjacent, but do not overlap
      Reservations.reserve({
        signatory1: 'rliu42',
        signatory2: 'bmatt',
        signatory3: 'lahuang4',
        date: '2014-03-31',
        start: '2:00pm',
        end: '4:00pm',
        room: 'Conference Room',
        reason: 'prepare for freshmen party'
      }, done);
    },
    function(done) {
      Reservations.getReservationsWithUser(now, {email: 'rliu42@mit.edu'},
          function(err, reservations) {
        test(reservations.length === 2);
        test(reservations[0].summary === 'Conference Room - rliu42');
        test(reservations[0].description === 'Freshmen party');
        test(reservations[1].summary === 'Conference Room - rliu42');
        test(reservations[1].description === 'prepare for freshmen party');
        done();
      });
    },
    function(done) {
      // Confirm a reservation
      Reservations.getReservationsWithUser(now, {email: 'kyc2915@mit.edu'},
          function(err, reservations) {
            reservations[0].confirm(done);
          });
    },
    function(done) {
      // Deny a reservation
      Reservations.getReservationsWithUser(now, {email: 'vhung@mit.edu'},
          function(err, reservations) {
            reservations[0].deny('Too dangerous', done);
          });
    },
    function(done) {
      // Check results of confirming and denying
      Reservations.getReservations(now, function(err, reservations) {
        test(reservations.length === 3);
        // most recently updated
        test(reservations[2].summary === 'Country Kitchen - kyc2915');
        test(reservations[2].status === 'confirmed');
        // check that vhung's reservation is gone
        test(reservations[0].summary !== 'Courtyard & BBQ Pits - vhung');
        test(reservations[1].summary !== 'Courtyard & BBQ Pits - vhung');
        done();
      });
    },
    function(done) {
      // Clear made reservations
      Reservations.getReservations(now, function(err, reservations) {
        var count = reservations.length;
        for (var i = 0; i < reservations.length; i++) {
          reservations[i].remove(function(err) {
            test(!err);
            if (--count === 0) {
              done();
            }
          });
        }
      });
    },
    function(done) {
      // Check that reservations really are all cleared
      Reservations.getReservations(now, function(err, reservations) {
        test(!err && reservations.length === 0, 'Failed to clear all test reservations');
        done();
      });
    }]);

