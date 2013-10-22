var Database = require('./db');
var validation = require('./validation');
var mailer = require('./mailer');

var exec = require('child_process').exec;

function Model() {
  this.db = new Database();
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
    validation.validate(guests[i].kerberos, function(kerberos, isUser) {
      if (!isUser) {
        invalids.push(kerberos);
      }
      if (--count == 0) {
        callback(invalids);
      }
    });
  }
}

module.exports = Model
