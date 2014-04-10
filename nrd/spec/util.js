// Change to test settings
var settings = require('../models/config').config_data;
settings.db_settings.host = 'nextres.mit.edu';
settings.db_settings.name = 'next+nextres_test';
settings.mail_settings.do_not_email = true;
settings.calendar_settings.calID = (
    '2b3vk9fsrgpgvbv4u5ce5oe888@group.calendar.google.com');

/*
 * Convenience function to run multiple functions in sequence
 * e.g. runFunctions([function1, function2, ...], done)
 */
module.exports.runFunctions = function(functions) {
  helperFunctions = [];
  function helper(i, err, result) {
    if (i == functions.length) {
      console.log('COMPLETE');
      process.exit();
    }
    functions[i](function(err, result) {
      console.assert(!err, err);
      console.log('finished test ' + i);
      helper(i + 1, err, result);
    });
  }
  helper(0);
}

/*
 * Convenience function for asserting the verify of the specified testValue.
 */
module.exports.test = function(testValue, message) {
  console.assert(testValue, message);
}

/*
 * Convenience function for asserting the equality of two objects.
 */
module.exports.testObj = function(testValue, expected, message) {
  console.assert(JSON.stringify(testValue) === JSON.stringify(expected), message);
}
