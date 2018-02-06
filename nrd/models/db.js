/*
 * Database API
 *
 * Allows for convenient commands to the MySQL database.
 *
 * To construct a query using this API, first call the query() command to get
 *   a new query string object. Each function corresponding to a MySQL
 *   command (select, from, etc.) returns the query string back, so these
 *   functions can be chained together (see below). Finally, call execute.
 *
 * A convenience method Database.execute(command, callback) allows for
 *   execution of an arbitrary MySQL command.
 *
 * Example:
 * var Database = require('db').Database;
 * Database.query().select([values])
 *                 .from(table)
 *                 .where("something=?", [value])
 *                 .limit(1)
 *                 .execute(function(err, rows, fields) {
 *                   ...
 *                 });
 *
 * Database.execute('CREATE TABLE next-users...', function(err, rows, fields) {
 *   ...
 * });
 */

var mysql = require('mysql');
var logger = require('./logger');
var connect = require('connect-mysql');

var db_settings = require('./config').config_data.db_settings;
var db_url = 'mysql://' + db_settings.host + ':' +
        (db_settings.port || 3306) + '/' + db_settings.name +
        '?user=' + db_settings.user + '&password=' + db_settings.password;
var pool = mysql.createPool(db_url);

var Database = function() {
  var that = Object.create(Database.prototype);
  Object.freeze(that);
  return that;
};

var Query = function() {
  this.query = '';
  this.args = [];
};

/*
 * Function to construct a new query.
 * e.g. Database.query().select(...
 */
Database.prototype.query = function() {
  return new Query();
};

/*
 * Convenience function to execute any query.
 * query is any string with ESCAPED characters
 * callback(error, rows, fields)
 */
Database.prototype.execute = function(command, callback) {
  var query = new Query();
  query.query = command;
  query.execute(callback);
};

/*
 * Get a session store for this database.
 */
Database.prototype.store = function(express) {
  var MySQLStore = connect(express);
  var options = {
    pool: pool,
    config: {
      user: db_settings.user,
      password: db_settings.password,
      database: db_settings.name,
    }
  };
  return new MySQLStore(options);
};

/*
 * Select the given columns; should be followed with a .from().
 * args is a list of column names
 * e.g. select(['id', 'name'])
 */
Query.prototype.select = function(args) {
  this.query += 'SELECT ';
  for (var i = 0; i < args.length - 1; i++) {
    if (args[i] !== '*') {
      this.query += '`' + args[i] + '`, ';
    } else {
      this.query += args[i] + ', ';
    }
  }
  if (args[args.length - 1] !== '*') {
    this.query += '`' + args[args.length-1] + '` ';
  } else {
    this.query += args[args.length - 1] + ' ' ;
  }
  return this;
};

/*
 * Delete from the specified table.
 * e.g. deleteFrom('next-users')
 */
Query.prototype.deleteFrom = function(table) {
  this.query += 'DELETE ';
  return this.from(table);
};

/*
 * Clause from the specified table; should be preceded with .select().
 * e.g. from('next-users')
 */
Query.prototype.from = function(table) {
  this.query += 'FROM ?? ';
  this.args.push(table);
  return this;
};

/*
 * Insert where clause with the given rules and arguments.
 * rules: a clause containing '?' symbols to be replaced by...
 * arguments: a list of parameters (not necessarily escaped)
 * e.g. where('id = ?', [0])
 */
Query.prototype.where = function(rules, args) {
  this.query += 'WHERE ' + rules + ' ';
  for (var i = 0; i < args.length; ++i) {
    this.args.push(args[i]);
  }
  return this;
};

/*
 * Limit clause
 * e.g. limit(100)
 */
Query.prototype.limit = function(limit) {
  this.query += 'LIMIT ' + limit + ' ';
  return this;
};

/*
 * Insert given values into the columns in the table
 * e.g. insert('next-users', ['id', 'name'], [2915, 'kyc'])
 */
Query.prototype.insert = function(table, columns, values) {
  this.query += 'INSERT INTO `' + table + '` ';
  this.query += '(' + columns.join() + ') ';
  this.query += 'VALUES (?) ';
  this.args.push(values);
  return this;
};

/*
 * Update given values in the columns in the table
 * e.g. insert('next-users', ['id', 'name'], [2915, 'kyc'])
 */
Query.prototype.update = function(table, columns, values) {
  this.query += "UPDATE `" + table + "` SET ";
  for (var i = 0; i < columns.length-1; ++i) {
    this.query += "??=?, ";
    this.args.push(columns[i],values[i]);
  }
  this.query += "??=? ";
  this.args.push(columns[columns.length-1],values[columns.length-1]);
  return this;
};

/*
 * Right join on the given table
 * e.g. rightJoin('next-users')
 */
Query.prototype.rightJoin = function(table) {
  this.query += "RIGHT JOIN ?? ";
  this.args.push(table);
  return this;
};

/*
 * Left join on the given table
 * e.g. leftJoin('next-users')
 */
Query.prototype.leftJoin = function(table) {
  this.query += "LEFT JOIN ?? ";
  this.args.push(table);
  return this;
};

/*
 * Inner join on the given table
 * e.g. innerJoin('next-users')
 */
Query.prototype.innerJoin = function(table) {
  this.query += "INNER JOIN ?? ";
  this.args.push(table);
  return this;
};

/*
 * Order by the given column
 * e.g. orderBy('id')
 */
Query.prototype.orderBy = function(column) {
  this.query += 'ORDER BY ?? ';
  this.args.push(column);
  return this;
};

/*
 * Order by the given column, in decreasing order
 * e.g. orderByDesc('id')
 */
Query.prototype.orderByDesc = function(column) {
  this.orderBy(column);
  this.query += 'DESC ';
  return this;
};

/*
 * On clause, should be preceded by join().
 * e.g. on('`next-users`.id = `next-guestlist`.nextUser')
 */
Query.prototype.on = function(conditions) {
  this.query += "ON " + conditions + " ";
  return this;
};

/*
 * Execute a given query.
 * e.g. Database.query().select(...).from(...).execute(callback)
 * callback(error, rows, fields)
 */
Query.prototype.execute = function(callback) {
  var query = this.query;
  var args = this.args;
  if (query) {
    pool.getConnection(function(err, connection) {
      if (err) {
        logger.error(err);
        callback(err);
      } else {
        logger.info(query);
        logger.info(args);
        connection.query(query, args, function(err, rows, fields) {
          connection.release();
          callback(err, rows, fields);
        });
      }
    });
  }
};

module.exports.Database = new Database();
