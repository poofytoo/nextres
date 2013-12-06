var Database = require('./db');

var exec = require('child_process').exec;

function House() {
  this.db = new Database();
}

House.prototype.getFiles = function(callback) {
  this.db.query().
    select(['*']).
    from('next-minutes').
    orderByDESC('date');
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

House.prototype.removeFile = function(id, callback) {
  this.db.query().
    deleteFrom('next-minutes').
    where('id = ?', [id]).
    limit(1);
  this.db.execute(function(error, result) {
    callback(error);
  });
}

module.exports = House
