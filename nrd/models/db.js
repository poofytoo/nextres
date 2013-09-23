var mysql = require('mysql2');

// All these functions return the Query object back
// so you can chain the functinos together like
// queryObject.select([ values])
//            .from(table)
//            .where("something=?", [value])
//            .limit(1)

// To execute sql query, construct the query
// then call db.execute(callback)
// see model.js for examples

function Query() {
  this.queryString = '';
}

Query.prototype.select = function(arr) {
  this.queryString += 'SELECT ';
  for (var i = 0; i < arr.length - 1; i++) {
    if (arr[i] !== '*') {
      this.queryString += '`' + arr[i] + '`, ';
    } else {
      this.queryString += arr[i] + ', ';
    }
  }
  if (arr[arr.length - 1] !== '*') {
    this.queryString += '`' + arr[arr.length-1] + '` ';
  } else {
    this.queryString += arr[arr.length - 1] + ' ' ;
  }
  return this;
}

Query.prototype.deleteFrom = function(table) {
  this.queryString += 'DELETE ';
  return this.from(table);
}

Query.prototype.from = function(table) {
  this.queryString += 'FROM `' + table + '` ';
  return this;
}

Query.prototype.where = function(rules, arr) {
  var where = 'WHERE ';
  var idx = 0;
  while (rules.indexOf('?') >= 0) {
    var temp = rules.substring(0, rules.indexOf('?') + 1);
    temp = temp.replace('?', '\'' + arr[idx] + '\'');
    where += temp;
    idx ++;
    rules = rules.substring(rules.indexOf('?') + 1);
  }
  this.queryString += where + rules + ' ';
  return this;
}

Query.prototype.limit = function(limit) {
  this.queryString += 'LIMIT ' + limit + ' ';
  return this;
}

Query.prototype.insert = function(table, columns, values) {
  this.queryString += 'INSERT INTO `' + table + '` ';
  this.queryString += '(' + columns.join() + ') ';
  for (var i = 0; i < values.length; i++) {
    values[i] = '\'' + values[i] + '\'';
  }
  this.queryString += 'VALUES (' + values.join() + ') ';
  return this;
}

Query.prototype.update = function(table, columns, values) {
  this.queryString += "UPDATE `" + table + "` SET ";
  for (var i = 0; i < columns.length - 1; i++) {
    this.queryString += columns[i] + "='" + values[i] + "', ";
  }
  this.queryString += columns[columns.length-1] + "='" + values[columns.length-1] + "' ";
  return this;
}

Query.prototype.rightJoin = function(table) {
  this.queryString += "RIGHT JOIN `" + table + "` ";
  return this;
}

Query.prototype.leftJoin = function(table) {
  this.queryString += "LEFT JOIN `" + table + "` ";
  return this;
}

//TODO - make this function less lame
Query.prototype.orderBy = function(column) {
  this.queryString += 'ORDER BY ' + column + ' ';
}

Query.prototype.on = function(conditions) {
  this.queryString += "ON ";
  for (var i = 0; i < conditions.length - 1; i++) {
    this.queryString += conditions[i][0] + ' = ' + conditions[i][1] + ' AND ';
  }
  this.queryString += conditions[conditions.length - 1][0] + ' = ' + conditions[conditions.length - 1][1] + ' ';
  return this;
}

Query.prototype.isDefined = function() {
  return this.queryString !== undefined && this.queryString.length > 0;
}

Query.prototype.raw = function(query) {
  this.queryString = query;
  return this.queryString
}

function Database() {

  //this.connection = mysql.createConnection('mysql://sql.mit.edu:3306/next+nextres?user=next&password=645cf777');
}

Database.prototype.query = function () {
  this.queryString = new Query();
  return this.queryString;
}

Database.prototype.execute = function(callback) {
  if (this.queryString !== undefined && this.queryString.isDefined) {
    this.connection = mysql.createConnection('mysql://sql.mit.edu:3306/next+nextres?user=next&password=645cf777');
    this.connection.connect();
    console.log(this.queryString.queryString);
    this.connection.query(this.queryString.queryString, function(err, rows, fields) {
      this.queryString = undefined;
      callback(err, rows, fields);
    });
    this.connection.end();
  }
}

module.exports = Database
