/*
 * GUESTLIST API
 *
 * A GuestList object contains the following fields:
 *      id: unique int id
 *      userID: id of User who owns this guestlist
 *      guest1Name: name of 1st guest
 *      guest1Kerberos: kerberos of 1st guest
 *      guest2Name
 *      guest2Kerberos
 *      ...
 *
 * The maximum number of guests is given by MAX_NUM_GUESTS.
 *
 * e.g. {id: 1, userID: 1, guest1Name: 'Becky Shi', guest1Kerberos: 'beckyshi'}
 */

var logger = require('./logger');
var db = require('./db').Database;

const MAX_NUM_GUESTS = 10;
const NUM_GUESTS = 5;

function GuestLists() {
  this.MAX_NUM_GUESTS = MAX_NUM_GUESTS;
}

function nameField(index) {
  return 'guest' + index + 'Name';
}

function kerberosField(index) {
  return 'guest' + index + 'Kerberos';
}

GuestLists.prototype.nameField = nameField;
GuestLists.prototype.kerberosField = kerberosField;

function GuestList(guestlist) {
  this.id = guestlist.id;
  this.userID = guestlist.userID;
  for (var i = 1; i <= MAX_NUM_GUESTS; i++) {
    this[nameField(i)] = guestlist[nameField(i)];
    this[kerberosField(i)] = guestlist[kerberosField(i)];
  }
}

/******************************************************************************
 *
 * READ FUNCTIONS
 *
 ******************************************************************************/

/*
 * Returns the GuestList with the given ID, or false if nonexistent
 */
GuestLists.prototype.getGuestList = function(id, callback) {
  db.query().select(['*']).from('next-guestlist').where('id = ?', [id])
    .execute(function(err, rows) {
      if (err) {
        callback(err);
      } else if (rows.length === 0) {
        callback('No guest list found.');
      } else {
        callback(false, new GuestList(rows[0]));
      }
    });
}

/*
 * Returns the GuestList with the given userID, or false if nonexistent
 */
GuestLists.prototype.getGuestListOfUser = function(userID, callback) {
  db.query().select(['*']).from('next-guestlist').where('userID = ?', [userID])
    .execute(function(err, rows) {
      if (err) {
        callback(err);
      } else if (rows.length === 0) {
        callback('No guest list found.');
      } else {
        callback(false, new GuestList(rows[0]));
      }
    });
}

/*
 * Converts the GuestList in a form easy for handlebars parsing
 */
GuestLists.prototype.guestListToObj = function(guestlist) {
  guestlist.guests = [];
  for (var i = 1; i <= NUM_GUESTS; i++) {
    guestlist.guests.push({
      name: guestlist[nameField(i)],
      kerberos: guestlist[kerberosField(i)],
      index: i
    });
  }
  guestlist.tempGuests = [];
  guestlist.hasTempGuests = false;
  for (var i = 1; i <= NUM_GUESTS; i++) {
    guestlist.tempGuests.push({
      name: guestlist[nameField(i + NUM_GUESTS)],
      kerberos: guestlist[kerberosField(i + NUM_GUESTS)],
      index: i + NUM_GUESTS
    });
    if (guestlist[kerberosField(i + NUM_GUESTS)]) {
      guestlist.hasTempGuests = true;
    }
  }
  return guestlist;
}

/*
 * Returns a list of objects representing each GuestList and its user info.
 *   params contains an optional hostSearchPattern parameter or
 *   guestSearchPattern parameter, as well as an optional sortBy parameter.
 *   e.g. params = {hostSearchPattern: 'kyc', sortBy: 'firstName'}
 *     or params = {guestSearchPattern: 'becky'}
 *
 * Each object in the result contains all the fields of a User and GuestList
 *   object (but is not either one of the objects),
 *   e.g. callback(error, [{userID: 1, kerberos: 'kyc2915',
 *     guest1Name: 'Becky Shi', guest1Kerberos: 'beckyshi', ...}, ...])
 */
GuestLists.prototype.listGuests = function(params, callback) {
  var query = db.query().select(['*']).from('next-users')
    .rightJoin('next-guestlist').on('`next-users`.id=`next-guestlist`.userID');
  if (params && params.hostSearchPattern) {
    var pattern = '%' + params.hostSearchPattern + '%';
    query = query.where('firstName LIKE ? OR lastName LIKE ? OR kerberos LIKE ?', 
        [pattern, pattern, pattern]);
  } else if (params && params.guestSearchPattern) {
    var pattern = '%' + params.guestSearchPattern + '%';
    var whereClause = [];
    var whereArgs = [];
    for (var i = 1; i <= MAX_NUM_GUESTS; i++) {
      whereClause.push(nameField(i) + ' LIKE ?');
      whereClause.push(kerberosField(i) + ' LIKE ?');
      whereArgs.push(pattern);
      whereArgs.push(pattern);
    }
    query = query.where(whereClause.join(' OR '), whereArgs);
  }
  if (params && params.sortBy) {
    query = query.orderBy(params.sortBy);
  }
  query.execute(callback);
}

/*
 * Returns all guests that are already on the guestlist, but not
 *   on the guestlist of the specified user.
 * callback(error, [{guest: 'runbobby', host: [User object]}, ...])
 */
GuestLists.prototype.findRepeatedGuests = function(guestlist, user, callback) {
  var repeatedGuests = [];
  var count = MAX_NUM_GUESTS;
  var listGuests = this.listGuests;
  for (var i = 1; i <= MAX_NUM_GUESTS; i++) {
    if (guestlist[kerberosField(i)]) {
      var loop = function(guest) {
        listGuests({guestSearchPattern: guest},
          function(err, guestlists) {
            if (err) {
              count = -1;
              callback(err);
            }
            // Make sure we are not checking user's own guestlist.
            for (var j = 0; j < 2; j++) {
              if (guestlists[j] &&
                guestlists[j].kerberos !== user.kerberos) {
                  repeatedGuests.push({guest: guest, host: guestlists[j]});
                  break;
                }
            }
            if (--count == 0) {
              repeatedGuests.sort();
              callback(false, repeatedGuests);
            }
          });
      }
      loop(guestlist[kerberosField(i)]);
    } else {
      count--;
    }
  }
  if (count == 0) {  // if no loops are called
    callback(false, repeatedGuests);
  }
}

/******************************************************************************
 *
 * OBJECT FUNCTIONS (must be called on a GuestList object)
 *
 ******************************************************************************/

/*
 * Updates the guests on this guest list.
 * The guests object contains fields of the GuestList object
 *   (excluding the id and userID)
 * e.g. {guest1Name: 'Becky Shi', guest1Kerberos: 'beckyshi'}
 */
GuestList.prototype.updateGuests = function(guests, callback) {
  columns = [];
  values = [];
  for (var i = 1; i <= MAX_NUM_GUESTS; i++) {
    if (guests[kerberosField(i)] != null) {
      columns.push(nameField(i));
      columns.push(kerberosField(i));
      values.push(guests[nameField(i)] || '');
      values.push(guests[kerberosField(i)] || '');
    }
  }
  db.query().update('next-guestlist', columns, values)
    .where('id = ?', [this.id]).execute(callback);
}

module.exports.GuestLists = new GuestLists();
