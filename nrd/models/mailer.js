var nodemailer = require('../node_modules/nodemailer');
var logger = require('./logger');

var mail_settings = require('./config').config_data['mail_settings'];

function mail(receivers, ccs, subject, htmlEmail, textEmail) {
  logger.info('MAILING TO ' + receivers);
  //contacting user
  var smtpTransport = nodemailer.createTransport("SMTP", {
    service: "Gmail",
      auth: {
        user: mail_settings["user"],
        pass: mail_settings["password"],
      }
  });

  var mailOptions = {
    from: "Next Resident Dashboard <sparkyroombot@gmail.com>", // sender address
    to: receivers, // list of receivers
    cc: ccs, // list of ccs
    subject: subject, // Subject line
    text: textEmail, // plaintext body
    html: htmlEmail, // html body
  };

  smtpTransport.sendMail(mailOptions, function(error, response){
    if (error) {
      returnError += error + "\n";
      logger.error(error);
    } else {
      logger.info("Message sent: " + response.message);
    }
  });
}

exports.mail = mail;

exports.newUser = function(kerberos, passwordRaw) {
  var receiver = kerberos + "@mit.edu";
  var subject = "Your Next Resident Dashboard Account";
  var htmlEmail = "Hello!<br /><br />" + 
    "Your Next resident dashboard account has been created! Please " +
    "go to <a href='next.mit.edu'>next.mit.edu</a>, and click the " +
    "link on the top-right corner of the page. Login with your " +
    "kerberos ID and the following password: <b>" + passwordRaw +
    "</b>. Once you have logged in, please change your password." +
    "<br /><br />" +
    "If you have any questions, feel free to contact nextres@mit.edu" +
    "<br /><br />" +
    "Cheers,<br />" +
    "Sparky, the Next House Mailbot";
  var textEmail = "Hello! Your Next resident dashboard account has been created! Please go to <a href='next.mit.edu'>next.mit.edu</a>, and click the link on the top-right corner of the page. Login with your kerberos ID and the following password: " + passwordRaw + "Once you have logged in, please change your password. If you have any questions, feel free to contact nextres@mit.edu. Cheers, Sparky, the Next House Mailbot";
  mail(receiver, '', subject, htmlEmail, textEmail);
}

exports.resetPassword = function(kerberos, rawPassword) {
  var receiver = kerberos + "@mit.edu";
  var subject = "Password Reset";
  var htmlEmail = "Hello,<br /><br />" + 
      "The password to your Next resident dashboard account has been reset. "+
      "Login with your kerberos ID and the following password: <b>" + rawPassword +
      "</b>. Once you have logged in, please change your password." +
      "<br /><br />" +
      "If you have any questions, feel free to contact nextres@mit.edu" +
      "<br /><br />" +
      "Cheers,<br />" +
      "Sparky, the Next House Mailbot";
  var textEmail = "The password to your Next resident dashboard account has been reset. Login with your kerberos ID and the following password: " + rawPassword + "Once you have logged in, please change your password. If you have any questions, feel free to contact nextres@mit.edu. Cheers, Sparky, the Next House Mailbot";
  mail(receiver, '', subject, htmlEmail, textEmail);
}

exports.approveApplication = function(email, firstName) {
  var subject = "Request for Project Funding Approved";
  var htmlEmail = "Hello " + firstName+ ", <br /><br />" + 
    "NextExec has approved your application for the small group project funding!<br /><br />"+
    "If you have any questions, feel free to contact nextres@mit.edu." +
    "<br /><br />" +
    "Cheers,<br />" +
    "NextExec";
  var textEmail = "Hello, "+firstName+"NextExec has approved your application for the small group project funding! If you have any questions, feel free to contact nextres@mit.edu. Cheers, NextExec";
  mail(email, '', subject, htmlEmail, textEmail);
}

exports.denyApplication = function(email, firstName) {
  var subject = "Result of Application for Project Funding";
  var htmlEmail = "Hello " + firstName+ ", <br /><br />" + 
    "NextExec has denied your application for the following reason(s): <br />" +
    reason +
    ".<br /><br />" +
    "You have the option to reapply and submit another funding proposal.<br /><br />" +
    "If you have any questions, feel free to contact nextres@mit.edu." +
    "<br /><br />" +
    "Cheers,<br />" +
    "NextExec";
  var textEmail = "Hello, "+firstName+"NextExec has denied your application for the following reason(s): " + reason + ". You have the option to reapply and submit another funding proposal. If you have any questions, feel free to contact nextres@mit.edu. Cheers, NextExec";
  mail(email, '', subject, htmlEmail, textEmail);
}

// reserveParams contains attributes of the reservation details
exports.reserveRoom = function(reserveParams) {
  var subject = "[NextRes] " + reserveParams.room + " reserved by " + reserveParams.resident1;
  var htmlEmail = "Hello Next Exec, <br />" +
  	"<br />" +
    "A room reservation has been made. Here are the details: <br /><br />" +
    "<b>Residents</b>: " + reserveParams.resident1 + ", " + reserveParams.resident2 + "<br />" +
    "<b>Room</b>: " + reserveParams.room + "<br />" +
    "<b>Date</b>: " + reserveParams.date + "<br />" + 
    "<b>Time</b>: " + reserveParams.start + " to " + reserveParams.end + "<br />" + 
    "<b>Description</b>: " + reserveParams.reason + "<br /><br />" +
    "If this looks ok, feel free to ignore this email. " + 
    "If not, please go to <a href='http://nextres.mit.edu/managereservations'>NextRes</a> to view/deny.<br />" +
    "<br />" +
    "Cheers, <br />" +
    "Sparky, the Next House Mailbot";
  var textEmail = htmlEmail;
  var residents = [];
  for (var i = 0; i < reserveParams.attendees.length; i++) {
    residents.push(reserveParams.attendees[i].email);
  }
  mail(mail_settings["admin-emails"].join(), residents, subject, htmlEmail, textEmail);
}

// item is a Google Calendar events resource
exports.denyRoom = function(item, reason) {
  var receivers = [];
  for (var i = 0; i < item.attendees.length; i++) {
    receivers.push(item.attendees[i].email);
  }
  var subject = "Room Reservation denied";
  var htmlEmail = "Hi, <br /><br />" +
    "Your room reservation for " + item.summary + " has been denied for the following reason: <br /><br />" +
    reason + "<br /><br />" +
    "Please contact nextexec@mit.edu if you have any questions. (or reply to this email!) <br />" +
    "<br />" +
    "Cheers, <br />" +
    "NextExec";
  var textEmail = htmlEmail;
  mail(receivers.join(), mail_settings["admin-emails"].join(), subject, htmlEmail, textEmail);
}
