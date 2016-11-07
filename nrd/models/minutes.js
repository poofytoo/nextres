/*
 * MINUTES API
 *
 * A Minute object contains the following fields:
 *      id: unique int id
 *      name: name of minute
 *      date: date of minute
 *      path: path of minute file in filesystem
 *
 * e.g. {id: 1, name: 'House Meeting 1', date: 04/01/2014}
 */

var fs = require('fs');
var logger = require('./logger');
var db = require('./db').Database;
var exec = require('child_process').exec;

const MAX_MINUTE_SIZE = 10000000;
const MINUTES_DIR = 'public/documents/minutes/';

function Minutes() {
  exec('mkdir -p ' + MINUTES_DIR);  // create Minutes directory
}

function Minute(minute) {
  this.id = minute.id;
  this.name = minute.name;
  this.date = new Date(minute.date).toLocaleDateString('en-US', {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'});
  this.path = minute.path || MINUTES_DIR + minute.name;
}

/******************************************************************************
 *
 * READ FUNCTIONS
 *
 ******************************************************************************/

/*
 * Returns a list of all Minutes
 *   params contains an optional sortBy and desc boolean parameter.
 *   e.g. params = {sortBy: 'date', desc: true}
 */
Minutes.prototype.getMinutes = function(params, callback) {
  var query = db.query().select(['*']).from('next-minutes');
  if (params && params.sortBy) {
    query = params.desc ? query.orderByDesc(params.sortBy)
      : query.orderBy(params.sortBy);
  }
  query.execute(function(err, rows) {
    if (err) {
      callback(err);
    } else {
      for (var i = 0; i < rows.length; i++) {
        rows[i] = new Minute(rows[i]);
      }
      callback(err, rows);
    }
  });
}

/*
 * Returns the Minute with the given id, or false if nonexistent
 */
Minutes.prototype.getMinute = function(id, callback) {
  db.query().select(['*']).from('next-minutes').where('id = ?', [id])
    .execute(function(err, rows) {
      if (err) {
        callback(err);
      } else if (rows.length === 0) {
        callback('No minute found.');
      } else {
        callback(false, new Minute(rows[0]));
      }
    });
}

/******************************************************************************
 *
 * EDIT FUNCTIONS
 *
 ******************************************************************************/

/*
 * Creates a new Minute with the given name and date.
 *   Adds the uploaded Minute file to the filesystem.
 */
Minutes.prototype.addMinute = function(name, date, file, callback) {
  var path = MINUTES_DIR + file.name;
  db.query().insert('next-minutes', ['name', 'date', 'path'], [name, date, path])
    .execute(function(err) {
      if (err) {
        callback(err);
        return;
      }
      fs.readFile(file.path, function(err, data) {
        if (err) {
          callback(err);
          return;
        }
        fs.writeFile(path, data, callback);
      });
    });
}

/******************************************************************************
 *
 * OBJECT FUNCTIONS (must be called on a Minute object)
 *
 ******************************************************************************/

/*
 * Removes this Minute. Does not remove the file attached with it.
 */
Minute.prototype.remove = function(callback) {
  db.query().deleteFrom('next-minutes').where('id = ?', [this.id])
    .execute(callback);
}

module.exports.Minutes = new Minutes();
