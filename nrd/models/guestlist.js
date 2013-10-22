var Database = require('./db');

var exec = require('child_process').exec;

function GuestList() {
  this.db = new Database();
}

// Returns whether given kerberos is guest of someone at Next
GuestList.prototype.onGuestList = function(id, guests, callback) {
  var count = guests.length;
  var onGuestLists = [];
  var db = this.db;
  for (var i = 0; i < guests.length; i++) {
    var kerberos = guests[i].kerberos.replace(/[^a-zA-Z0-9\-_ ]/g, "");
    if (kerberos === '') {
        count--;
    } else {
      (function(kerberos) {
        db.query()
        .select(["firstName", "lastName"])
        .from("next-guestlist")
        .rightJoin("next-users")
        .on("`next-guestlist`.nextUser=`next-users`.id")
        .where("`next-users`.id != ? AND " +
            "( guest1Kerberos LIKE ? OR guest2Kerberos LIKE ? OR guest3Kerberos LIKE ? )",
                [id, kerberos, kerberos, kerberos]);
        db.execute(function(err, res) {
          if (res && res.length > 0) {
            res[0].kerberos = kerberos;
              onGuestLists.push(res[0]);
          }
          if (--count == 0) {
            callback(onGuestLists);
          }
        });
      })(kerberos);
    }
  }
}

GuestList.prototype.addGuests = function(id, guests, callback) {
  columns = [];
  guestValues = [];
  for (var i = 0; i < 3; i++) {
    columns.push('guest' + (i + 1) + 'Name');
    columns.push('guest' + (i + 1) + 'Kerberos');
    guestValues.push(guests[i].name.replace(/[^a-zA-Z0-9\-_ ]/g, ""));
    guestValues.push(guests[i].kerberos.replace(/[^a-zA-Z0-9\-_ ]/g, ""));
  }
  this.db.query().
    update('next-guestlist',
           columns,
           guestValues).
    where('nextUser = ?', [ id ]);
  this.db.execute(function(error, result) {
    callback(error, result);
  });
}

GuestList.prototype.getGuests = function(id, callback) {
  console.log(id);
  this.db.query().
    select(['*']).
    from('next-guestlist').
    where('nextUser = ?', [ id ]).
    limit(1);
  var db = this.db;
  this.db.execute(function(error, result) {
    if (result==undefined) {
      db.query().
        insert('next-guestlist',
               ['nextUser'],
               [id]);
      db.execute(function(error, result) {
        callback(error, result);
      });
    } else {
      console.log(result);
      callback(error, result[0]);
    }
  });
}

GuestList.prototype.listGuests = function(id, params, callback) {
  if (params.search !== undefined){
    console.log('searching');
    var s = "%" + params.value + "%";
    this.db.query()
      .select(["*"])
      .from("next-users")
      .rightJoin("next-guestlist")
    .on("`next-users`.id=`next-guestlist`.nextUser")
    .where('firstName LIKE ? OR lastName LIKE ? OR kerberos LIKE ?', [s, s, s])
    .orderBy(params.sort);
    
    console.log(this.db.queryString);
    this.db.execute(function(error, result) {
      callback(error, result)
    })
    
  } else {
    this.db.query()
      .select(["*"])
      .from("next-users")
      .rightJoin("next-guestlist")
      .on("`next-users`.id=`next-guestlist`.nextUser");
    this.db.execute(function(error, result) {
      console.log(error);
      callback(error, result)
    });
  }
}

module.exports = GuestList