var Database = require('./db');
var Email = require('./email');

var exec = require('child_process').exec;

function Funding() {
  this.db = new Database();
  this.email = new Email();
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
  console.log(id);
  this.db.query().
    select(['*']).
    from('next-project-funding').
    where('nextUser = ?', [ id ]).
    orderByDESC('Timestamp'); // Selects most recent application
  var db = this.db;
  this.db.execute(function(error, result) {
    console.log(id);
    if (result==undefined) {
      db.execute(function(error, result) {
        callback(error, result);
      });
    } else {
      console.log(result);
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
  var email = this.email;
  this.db.query().
  update('next-project-funding',
        ['Status'],
        ['Approved']).
   where('dateTime = ?', [ timestamp ]);  // Change Status from 'Pending' to 'Approved'
    db.execute(function(error, result) {
      if (error) {
        returnError += error + "\n";
        console.log('Error: ' + error);
      } else {
        console.log('Application approved: ' + timestamp);

        //contacting user
        returnError = email.approveEmail(returnError, firstName, email);
      }
    callback(returnError);
    });    
    db.execute(function(error, result) {
      if (error) {
        console.log('Error: ' + error);
      }
    });
}

// Deny funding application & notify user via e-mail.

Funding.prototype.denyApp = function(timestamp, reason, email, firstName, callback) {
  var returnError = "";
  var db = this.db;
  var email = this.email;
  var denied = 'Denied - '+reason;
  this.db.query().
  update('next-project-funding',
        ['Status'],
        [denied]).                       // Change Status from 'Pending' to 'Denied-' with reason given.
   where('dateTime = ?', [ timestamp ]); 
   db.execute(function(error, result) {
     if (error) {
        returnError += error + "\n";
        console.log('Error: ' + error);
     } else {
        console.log('Application denied: ' + timestamp);

        //contacting user
        returnError = email.denyEmail(returnError, firstName, email, reason);
      }    
  callback(returnError);
  });
  db.execute(function(error, result) {
      if (error) {
        console.log('Error: ' + error);
      }
  });
}

module.exports = Funding