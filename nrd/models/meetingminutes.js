var Database = require('./db');
var Email = require('./email');

var exec = require('child_process').exec;

function House() {
  this.db = new Database();
  this.email = new Email();
}

House.prototype.getFiles = function(callback) {
  this.db.query().
    select(['*']).
    from('next-minutes').
    orderBy('date');
  this.db.execute(function(error, result) {
    callback(error, result);
  });
}

House.prototype.addFile = function(name, date, callback) {
  this.db.query().
    insert('next-minutes', ['name', 'date'], [name, date]);
  this.db.execute(function(error, result) {
    callback(error);
  });
}

House.prototype.removeFile = function(name, callback) {
  this.db.query().
    deleteFrom('next-minutes').
    where('name = ?', [name]).
    limit(1);
  this.db.execute(function(error, result) {
    callback(error);
  });
}

module.exports = House