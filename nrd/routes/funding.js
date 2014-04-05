var util = require('./util');
var Model = require('../models/model');
var model = new Model();
var User = require('../models/user');
var userModel = new User();
var Funding = require('../models/funding');
var fundingModel = new Funding();
var logger = require('../models/logger');

// If application 'Pending', redirect and do not allow another submission. If most recent application 'Denied', notify user and allow resubmission.
exports.application = function(req, res) {
    fundingModel.getApp(req.user.id, function(error, result) {
      logger.info(result);
      if (result !== undefined) {
         if (result['Status']=='Pending'){ 
           util.registerContent('appcompleted');
           res.render('base.html', {'user': req.user,
                                 'permissions': req.permissions});
         } else if (result['Status'].substring(0,6)=='Denied') { 
            util.registerContent('application');
            var message = "Note: Your most recent application for was denied (check e-mail for reasons). You have the option of reapplying.";
            res.render('base.html', {'user': req.user,
                                     'permissions': req.permissions,
                                     'error': message});
         } else if (result['Status'].substring(0,8)=='Approved') { 
            util.registerContent('application');
            res.render('base.html', {'user': req.user,
                                     'permissions': req.permissions});
          }
       } else {
         util.registerContent('application');
         res.render('base.html', {'user': req.user,
                                 'permissions': req.permissions});
       }
    });
}

exports.submit = function(req, res) {
  logger.info(req.body);
  var id = req.user.id;
  var emptyFields = false;
  for (var i = 1; i <= 7; i++) {
    if (req.body['responseField' + i].replace(' ','') == "") {
      emptyFields = true;
    }
  } // check that all required fields are completed
  if (emptyFields) {
    util.registerContent('application');
    var error = '* Complete all required fields.';
    res.render('base.html', {'user': req.user,
        'permissions': req.permissions,
        'error': error});
  }
  else {
    responses = []
    for (var i = 1; i <= 7; i++) {
      responses.push(req.body['responseField' + i]);
    } 
    fundingModel.submitApp(id, responses, function(error, result) { 
      util.registerContent('appcompleted');
      var success = 'Thank you! Your application has been submitted.';
      res.render('base.html', {'user': req.user,
          'permissions': req.permissions,
          'success': success});
    });
  }
}

exports.view  = function(req, res) {
  var id = req.user.id;
  fundingModel.listApps(id, function(error, result) {
    util.registerContent('reviewapps');
    if (result==undefined) {
      res.render('base.html', {user: req.user, result: result, permissions: req.permissions});
    } else {
      res.render('base.html', {user: req.user, result: result, permissions: req.permissions});
    }
  });
}

exports.edit = function(req, res) {
  logger.info(req.body);
  var id = req.user.id;
  userModel.getUser (id, function(error, result) {
  logger.info(result);
  if (req.body['decision0'] == 'approve') {
    fundingModel.approveApp(req.body['timestamp0'], result['email'], result['firstName'], function (error) {  
      util.registerContent('reviewapps');
      var success = 'Application approved. Applicant has been notified.';
      res.render('base.html', {'user': req.user,
          'permissions': req.permissions,
          'success': success});
    });
  } else if (req.body['decision0'] == 'deny') {
      fundingModel.denyApp(req.body['timestamp0'], req.body['reason0'], result['email'], result['firstName'], function (error) {  
        util.registerContent('reviewapps');
        var error = 'Application denied. Applicant has been notified.';
        res.render('base.html', {'user': req.user,
            'permissions': req.permissions,
            'error': error});
      });
     } else if (req.body['decision0'] == undefined) {  
        util.registerContent('reviewapps');
        var error = 'Approve/deny not selected for first application listed. Please try again.' ;
        res.render('base.html', {'user': req.user,
            'permissions': req.permissions,
            'error': error});
      }
   });
}
