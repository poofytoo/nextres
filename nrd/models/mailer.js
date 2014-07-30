/*
 * Mailer
 *
 * Contains functions that send emails.
 *
 * The mailer can be disabled by setting mail_settings.do_not_email
 *   in config.json to true (as is done by the test suite, for example).
 */
var nodemailer = require('nodemailer');
var logger = require('./logger');

var mail_settings = require('./config').config_data.mail_settings;

function Mailer() {
}

/*
 * Basic mail function
 * params is an object with the following fields:
 *   to: list of emails to send to
 *   cc: list of emails to cc
 *   subject: subject line (string)
 *   html: html body (string)
 *   text: plaintext body (string)
 *
 * e.g. {to: ['next-exec@mit.edu'], cc: ['kyc2915@mit.edu'],
 *   subject: 'Hi', html: 'This is an <b>email</b>',
 *   text: 'This is an email}
 */
Mailer.prototype.mail = function(params) {
  logger.info('MAILING TO ' + params.to);

  // Exit (do not mail) if testing.
  if (mail_settings.do_not_email) {
    return;
  }

  // Contact SMTP server
  var smtpTransport = nodemailer.createTransport("SMTP", {
    service: "Gmail",
      auth: {
        user: mail_settings.user,
        pass: mail_settings.password
      }
  });

  // Update mail options
  mailOptions = {from: mail_settings.from, to: params.to.join(','),
    cc: params.cc.join(','), subject: params.subject,
    html: params.html, text: params.text};

  // Send the email
  smtpTransport.sendMail(mailOptions, function(err, res) {
    if (err) {
      logger.error(err);
    } else {
      logger.info("Message sent: " + res.message);
    }
  });
}

Mailer.prototype.newUser = function(user, rawPassword) {
  var to = [user.email];
  var cc = [];
  var subject = "Your Next Resident Dashboard Account";
  var html = "Hello!<br /><br />" + 
    "Your Next resident dashboard account has been created! Please " +
    "go to <a href='next.mit.edu'>next.mit.edu</a>, and click the " +
    "link on the top-right corner of the page. Login with your " +
    "kerberos ID and the following password: <b>" + rawPassword +
    "</b>. Once you have logged in, please change your password." +
    "<br /><br />" +
    "If you have any questions, feel free to contact nextres@mit.edu" +
    "<br /><br />" +
    "Cheers,<br />" +
    "Sparky, the Next House Mailbot";
  var text = "Hello! Your Next resident dashboard account has " +
    "been created! Please go to <a href='next.mit.edu'>next.mit.edu</a>, " +
    "and click the link on the top-right corner of the page. Login " +
    "with your kerberos ID and the following password: " + rawPassword +
    "Once you have logged in, please change your password. If you have " +
    "any questions, feel free to contact nextres@mit.edu. " +
    "Cheers, Sparky, the Next House Mailbot";
  this.mail({to: to, cc: cc, subject: subject, html: html, text: text});
}

Mailer.prototype.resetPassword = function(user, rawPassword) {
  var to = [user.email];
  var cc = [];
  var subject = "Password Reset";
  var html = "Hello,<br /><br />" + 
      "The password to your Next resident dashboard account has been reset. "+
      "Login with your kerberos ID and the following password: <b>" +
      rawPassword +
      "</b>. Once you have logged in, please change your password." +
      "<br /><br />" +
      "If you have any questions, feel free to contact nextres@mit.edu" +
      "<br /><br />" +
      "Cheers,<br />" +
      "Sparky, the Next House Mailbot";
  var text = "The password to your Next resident dashboard account " +
      "has been reset. Login with your kerberos ID and the following " +
      "password: " + rawPassword + "Once you have logged in, please " +
      "change your password. If you have any questions, feel free to " +
      "contact nextres@mit.edu. Cheers, Sparky, the Next House Mailbot";
  this.mail({to: to, cc: cc, subject: subject, html: html, text: text});
}

Mailer.prototype.approveApplication = function(email, firstName) {
  var to = [email];
  var cc = [];
  var subject = "Request for Project Funding Approved";
  var html = "Hello " + firstName + ", <br /><br />" + 
    "NextExec has approved your application for the small group project " +
    "funding!<br /><br />"+
    "If you have any questions, feel free to contact nextres@mit.edu." +
    "<br /><br />" +
    "Cheers,<br />" +
    "NextExec";
  var text = "Hello, " + firstName + "NextExec has approved your " +
    "application for the small group project funding! If you have any " +
    "questions, feel free to contact nextres@mit.edu. Cheers, NextExec";
  this.mail({to: to, cc: cc, subject: subject, html: html, text: text});
}

Mailer.prototype.denyApplication = function(email, firstName) {
  var to = [email];
  var cc = [];
  var subject = "Result of Application for Project Funding";
  var html = "Hello " + firstName+ ", <br /><br />" + 
    "NextExec has denied your application for the following reason(s): " +
    "<br />" + reason + ".<br /><br />" +
    "You have the option to reapply and submit another funding proposal. " +
    "<br /><br />" +
    "If you have any questions, feel free to contact nextres@mit.edu. " +
    "<br /><br />" +
    "Cheers,<br />" +
    "NextExec";
  var text = "Hello, " + firstName + "NextExec has denied your " +
    "application for the following reason(s): " + reason + ". You have " +
    "the option to reapply and submit another funding proposal. If you " +
    "have any questions, feel free to contact nextres@mit.edu. " +
    "Cheers, NextExec";
  this.mail(email, '', subject, htmlEmail, textEmail);
}

/*
 * reserveParams contains attributes of the reservation details
 */
Mailer.prototype.reserveRoom = function(reserveParams, attendees) {
  var to = mail_settings.admin_emails;
  var cc = [];  // cc all reservation signatories
  for (var i = 0; i < attendees.length; i++) {
    cc.push(attendees[i].email);
  }
  var subject = "[NextRes] " + reserveParams.room + " reserved by " + 
    reserveParams.signatory1;
  var html = "Hello Next Exec, <br />" +
    "<br />" +
    "A room reservation has been made. Here are the details: <br /><br />" +
    "<b>Residents</b>: " + reserveParams.signatory1 + ", " +
    reserveParams.signatory2 + (reserveParams.signatory3 ?
        ", " + reserveParams.signatory3 : "") + "<br />" +
    "<b>Room</b>: " + reserveParams.room + "<br />" +
    "<b>Date</b>: " + reserveParams.date + "<br />" + 
    "<b>Time</b>: " + reserveParams.start + " to " + reserveParams.end +
    "<br />" + 
    "<b>Description</b>: " + reserveParams.reason + "<br /><br />" +
    "If this looks ok, feel free to ignore this email. " + 
    "If not, please go to " +
    "<a href='http://nextres.mit.edu/managereservations'>NextRes</a> " +
    "to view/deny.<br />" +
    "<br />" +
    "Cheers, <br />" +
    "Sparky, the Next House Mailbot";
  var text = html;
  this.mail({to: to, cc: cc, subject: subject, html: html, text: text});
}

/*
 * item is a Google Calendar events resource
 */
Mailer.prototype.denyRoom = function(item, reason) {
  var to = [];  // send to all reservation signatories
  for (var i = 0; i < item.attendees.length; i++) {
    to.push(item.attendees[i].email);
  }
  var cc = mail_settings.admin_emails;
  var subject = "Room Reservation denied";
  var html = "Hi, <br /><br />" +
    "Your room reservation for " + item.summary + " has been denied for " +
    "the following reason: <br /><br />" + reason + "<br /><br />" +
    "Please contact nextexec@mit.edu if you have any questions. (or reply " +
    "to this email!) <br />" +
    "<br />" +
    "Cheers, <br />" +
    "NextExec";
  var text = html;
  this.mail({to: to, cc: cc, subject: subject, html: html, text: text});
}

/*
 * itemList is a list of Item objects
 */
Mailer.prototype.informOverdue = function(email, itemList) {
  var to = [email];
  var cc = ['next-overdue@mit.edu'];
  var subject = "Overdue Items";

  var overdueItemString = '';
  for (var i = 0; i < itemList.length; ++i) {
    overdueItemString += 
      'Item Name: ' + itemList[i].name + '<br />' + 
      'Barcode: ' + itemList[i].barcode + '<br />' +
      'Days Overdue: ' + itemList[i].daydiff + '<br /><br />';
  }

  var html =
    "Items you have checked out are overdue!<br />"+
    "If you have any questions or you believe this email has been sent in error, " +
    "feel free to contact nextres@mit.edu." +
    "<br /><br /><br />" +
    "Your Overdue Items:<br /><br />" +
    overdueItemString +
    "<br />" +
    "Cheers,<br />" +
    "Sparky, the Next House Mailbot";
  var text = html;
  this.mail({to: to, cc: cc, subject: subject, html: html, text: text});
}

module.exports.Mailer = new Mailer();
