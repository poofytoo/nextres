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
  this.arr = [];
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
  this.queryString += 'FROM ?? ';
  this.arr.push(table);
  return this;
}

Query.prototype.where = function(rules, arr) {
  this.queryString += 'WHERE ' + rules + ' ';
  for (var i = 0; i < arr.length; ++i) {
    this.arr.push(arr[i]);
  }
  return this;
}

Query.prototype.limit = function(limit) {
  this.queryString += 'LIMIT ' + limit + ' ';
  return this;
}

Query.prototype.insert = function(table, columns, values) {
  console.log('insert query');
  this.queryString += 'INSERT INTO `' + table + '` ';
  this.queryString += '(' + columns.join() + ') ';
  this.queryString += 'VALUES (?) ';
  this.arr.push(values);
  return this;
}

Query.prototype.update = function(table, columns, values) {
  this.queryString += "UPDATE `" + table + "` SET ";
  for (var i = 0; i < columns.length-1; ++i) {
    this.queryString += "??=?, ";
    this.arr.push(columns[i],values[i]);
  }
  this.queryString += "??=? ";
  this.arr.push(columns[columns.length-1],values[columns.length-1]);
  return this;
}

Query.prototype.rightJoin = function(table) {
  this.queryString += "RIGHT JOIN ?? ";
  this.arr.push(table);
  return this;
}

Query.prototype.leftJoin = function(table) {
  this.queryString += "LEFT JOIN ?? ";
  this.arr.push(table);
  return this;
}

Query.prototype.orderBy = function(column) {
  this.queryString += 'ORDER BY ?? ';
  this.arr.push(column);
}

Query.prototype.orderByDESC = function(column) {
  this.orderBy(column);
  this.queryString += 'DESC ';
}

Query.prototype.on = function(conditions) {
  this.queryString += "ON " + conditions + " ";
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
  if ( arguments.callee._singletonInstance )
    return arguments.callee._singletonInstance;

  arguments.callee._singletonInstance = this;

  this.sql_settings = { 
    host: 'mysql://sql.mit.edu:3306/next+nextres',
    user: 'next',
    password: '645cf777'
  };
  this.sql_settings = 'mysql://sql.mit.edu:3306/next+nextres?user=next&password=645cf777';
  this.pool = mysql.createPool(this.sql_settings);
}

Database.prototype.query = function () {
  this.queryString = new Query();
  return this.queryString;
}

Database.prototype.execute = function(callback) {
  var obj = this;
  var queryString = this.queryString;
  if (queryString !== undefined && queryString.isDefined()) {
    this.pool.getConnection(function(err, connection) {
        if (err) {
          console.log(err);
          callback(err);
        } else {
          console.log(queryString.queryString);
          console.log(queryString.arr);
          connection.query(queryString.queryString, queryString.arr,
            function(err, rows, fields) {
              obj.queryString = undefined;
              connection.end();
              callback(err, rows, fields);
            }
          );
        }
    });
  }
}

module.exports = Database
