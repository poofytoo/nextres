var util = require('./util');
var pm = require('../models/permissions').Permissions;

var testObj = util.testObj;

util.runFunctions([
    function(done) {
      testObj(pm.getPermissions(0), {});
      done();
    },
    function(done) {
      var adminPermissions = pm.getPermissions(1);
      for (var i = 0; i < pm.GROUPS; i++) {
        var groupPermissions = pm.getPermissions(i);
        for (var j = 0; j < groupPermissions.length; j++) {
          var groupPermission = pm.PERMISSIONS[groupPermissions[j]];
          test(adminPermissions[groupPermission]);
        }
      }
      done();
    }]);
