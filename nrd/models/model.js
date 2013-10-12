var Database = require('./db');
var Email = require('./email');

var exec = require('child_process').exec;

function Model() {
  this.db = new Database();
  this.email = new Email();
}

// Can probably use joins but i hate joins

Model.prototype.getPermissions = function(id, callback) {
  console.log(id);
  var db = this.db;
  this.db.query()
    .select(["group"])
    .from("next-users")
    .where("id = ?", [ id ])
    .limit(1);
  var groupID;
  this.db.execute(function(error, result) {
    groupID = result[0].group;
    db.query()
      .select(["permissionID"])
      .from("next-group-permission")
      .where("groupID = ?", [ groupID ]);
    var userPermissions = [];
    db.execute(function(err, res) {
      for (var i = 0; i < res.length; i++) {
        userPermissions.push(res[i].permissionID);
      }
      db.query()
        .select("*")
        .from("next-permissions");
      var allPermissions = [];
      db.execute(function(err2, res2) {
        allPermissions = res2;
        var permissions = {};
        for (var i = 0; i < allPermissions.length; i++) {
           var permission = allPermissions[i];
           permissions[permission.name] = (userPermissions.indexOf(permission.id) >= 0);
        }
        callback(permissions);
      });
    });
  });
}

// Very dirty kerberos validation
Model.prototype.validateKerberos = function(guests, callback) {
  var count = guests.length;
  var invalids = [];
  for (var i = 0; i < guests.length; i++) {
    var kerberos = guests[i].kerberos.replace(/[^a-zA-Z0-9\-_ ]/g, "");
    if (kerberos === '') {
      count--;
    } else {
      (function(kerberos) {
        exec('finger ' + kerberos + '@athena.dialup.mit.edu',
            function(error, stdout, stderr) {
              if (stdout.indexOf('no such user.') != -1) {
                invalids.push(kerberos);
              }
              if (--count == 0) {
                callback(invalids);
              }
            });
      })(kerberos);
    }
  }
}

module.exports = Model
