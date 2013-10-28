var Database = require('./db');
var mailer = require('./mailer');
var logger = require('./logger');

var exec = require('child_process').exec;

function Funding() {
  this.db = new Database();
}

Funding.prototype.submitApp = function(id, responseFields, callback) {
  columns = ['nextUser','groupMembers','projectDescription', 'reasonForFunding', 
             'communityBenefit', 'peopleInvolved', 'requestedAmount', 
             'costBreakdown', 'Status', 'dateTime', 'Timestamp'];
  responses = [id];
  for (var i = 0; i < 7; i++) {
    responses.push(responseFields[i]);
  }
  responses.push('Pending'); // Set 'Status' to 'Pending'
  d = new Date(); 
  var dateTime = d.getMonth()+1+'/'+d.getDate()+'/'+d.getFullYear()+'_'
                +d.getHours()+':'+d.getMinutes()+':'+d.getSeconds();
  responses.push(dateTime)
  responses.push(Date.now()+''); // Timestamp
  this.db.query().
    insert('next-project-funding',
           columns,
           responses);
  this.db.execute(function(error, result) {
    callback(error, result);
  });
}

Funding.prototype.getApp = function(id, callback) {
  logger.info(id);
  this.db.query().
    select(['*']).
    from('next-project-funding').
    where('nextUser = ?', [ id ]).
    orderByDESC('Timestamp'); // Selects most recent application
  var db = this.db;
  this.db.execute(function(error, result) {
    logger.info(id);
    if (result==undefined) {
      db.execute(function(error, result) {
        callback(error, result);
      });
    } else {
      logger.info(result);
      callback(error, result[0]);
    }
  });
}

// Lists pending small group funding applications

Funding.prototype.listApps = function(id, callback) {
  this.db.query()
  .select(["*"])
  .from('next-project-funding')
        .where('Status = ?', [ 'Pending' ]);
  this.db.execute(function(error, result) {
    callback(error, result)
  })
}

// Approve funding application & notify user via e-mail

Funding.prototype.approveApp = function(timestamp, email, firstName, callback) {
  var returnError = "";
  var db = this.db;
  this.db.query().
  update('next-project-funding',
        ['Status'],
        ['Approved']).
   where('dateTime = ?', [ timestamp ]);  // Change Status from 'Pending' to 'Approved'
    db.execute(function(error, result) {
      if (error) {
        returnError += error + "\n";
        logger.error('Error: ' + error);
      } else {
        logger.info('Application approved: ' + timestamp);
        mailer.approveApplication(email, firstName);
      }
    callback(returnError);
    });    
    db.execute(function(error, result) {
      if (error) {
        logger.error('Error: ' + error);
      }
    });
}

// Deny funding application & notify user via e-mail.

Funding.prototype.denyApp = function(timestamp, reason, email, firstName, callback) {
  var returnError = "";
  var db = this.db;
  var denied = 'Denied - '+reason;
  this.db.query().
  update('next-project-funding',
        ['Status'],
        [denied]).                       // Change Status from 'Pending' to 'Denied-' with reason given.
   where('dateTime = ?', [ timestamp ]); 
   db.execute(function(error, result) {
     if (error) {
        returnError += error + "\n";
        logger.error('Error: ' + error);
     } else {
        logger.info('Application denied: ' + timestamp);
        mailer.denyApplication(email, firstName);
      }    
  callback(returnError);
  });
  db.execute(function(error, result) {
      if (error) {
        logger.error('Error: ' + error);
      }
  });
}

module.exports = Funding
