var util = require('./util');
var Model = require('../models/model');
var model = new Model();

// If application 'Pending', redirect and do not allow another submission. If most recent application 'Denied', notify user and allow resubmission.
exports.application = function(req, res) {
  console.log(req.user);
  if (req.user !== undefined) {
      model.getApp(req.user.id, function(error, result) {
        console.log(result);     
        if (result !== undefined) {
           if (result['Status']=='Pending'){ 
             util.registerContent('appcompleted');
             model.getPermissions(req.user.id, function(permissions) {
             res.render('base.html', {'user': req.user,
                                   'permissions': permissions});
             });
           } else if (result['Status'].substring(0,6)=='Denied') { 
              util.registerContent('application');
              model.getPermissions(req.user.id, function(permissions) {
              var message = "Note: Your most recent application for was denied (check e-mail for reasons). You have the option of reapplying.";
              res.render('base.html', {'user': req.user,
                                       'permissions': permissions,
                                       'error': message});
              });
           } else if (result['Status'].substring(0,8)=='Approved') { 
              util.registerContent('application');
              model.getPermissions(req.user.id, function(permissions) {
              res.render('base.html', {'user': req.user,
                                       'permissions': permissions});
              });
            }
         } else {
           util.registerContent('application');
           model.getPermissions(req.user.id, function(permissions) {
           res.render('base.html', {'user': req.user,
                                   'permissions': permissions});
           });
         }
      });
  } else {
    res.redirect('/login');
  }
}

exports.submit = function(req, res) {
  console.log(req.user);
  console.log(req.body);
  var id = req.user.id;
  if (req.user !== undefined) {
    var emptyFields = false;
    for (var i = 1; i <= 7; i++) {
      if (req.body['responseField' + i].replace(' ','') == "") {
        emptyFields = true;
      }
    } // check that all required fields are completed
    if (emptyFields) {
      util.registerContent('application');
        model.getPermissions(id, function(permissions) {
          var error = '* Complete all required fields.';
          res.render('base.html', {'user': req.user,
              'permissions': permissions,
              'error': error});
        });
    }
    else {
      responses = []
      for (var i = 1; i <= 7; i++) {
        responses.push(req.body['responseField' + i]);
      } 
      model.submitApp(id, responses, function(error, result) { 
        util.registerContent('appcompleted');
        model.getPermissions(id, function(permissions) {
          var success = 'Thank you! Your application has been submitted.';
          res.render('base.html', {'user': req.user,
              'permissions': permissions,
              'success': success});
        });
      });
    }
  } else {
    res.redirect('/login');
  }
}

exports.view  = function(req, res) {
  if (req.user !== undefined) {
    var id = req.user.id;
    console.log(id);
    model.listApps(id, function(error, result) {
      util.registerContent('reviewapps');
      if (result==undefined) {
        model.getPermissions(req.user.id, function(permissions) {
        res.render('base.html', {user: req.user, result: result, permissions: permissions});
        });
      } else {
        model.getPermissions(req.user.id, function(permissions) {
          res.render('base.html', {user: req.user, result: result, permissions: permissions});
        });
      }
    });
  } else {
    res.redirect('/login');
  }
}

exports.edit = function(req, res) {
  console.log(req.body);
  if (req.user !== undefined) {
    var id = req.user.id;
    model.getUser (id, function(error, result) {
    console.log(result);
    if (req.body['decision0'] == 'approve') {
      model.approveApp(req.body['timestamp0'], result['email'], result['firstName'], function (error) {  
        util.registerContent('reviewapps');
        model.getPermissions(id, function(permissions) {
          var success = 'Application approved. Applicant has been notified.';
          res.render('base.html', {'user': req.user,
              'permissions': permissions,
              'success': success});
        });
      });
    } else if (req.body['decision0'] == 'deny') {
        model.denyApp(req.body['timestamp0'], req.body['reason0'], result['email'], result['firstName'], function (error) {  
          util.registerContent('reviewapps');
          model.getPermissions(id, function(permissions) {
          var error = 'Application denied. Applicant has been notified.';
          res.render('base.html', {'user': req.user,
              'permissions': permissions,
              'error': error});
          });
        });
       } else if (req.body['decision0'] == undefined) {  
          util.registerContent('reviewapps');
          model.getPermissions(id, function(permissions) {
          var error = 'Approve/deny not selected for first application listed. Please try again.' ;
          res.render('base.html', {'user': req.user,
              'permissions': permissions,
              'error': error});
          });
        }
     });
   } else {
    res.redirect('/login');
  }
}