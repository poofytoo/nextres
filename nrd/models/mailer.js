var nodemailer = require('../node_modules/nodemailer');

function mail(receivers, subject, htmlEmail, textEmail) {
  console.log('MAILING TO ' + receivers);
  //contacting user
  var smtpTransport = nodemailer.createTransport("SMTP", {
    service: "Gmail",
      auth: {
        user: "sparkyroombot@gmail.com",
        pass: "pencilpencil"
      }
  });

  var mailOptions = {
    from: "Next Resident Dashboard <sparkyroombot@gmail.com>", // sender address
    to: receivers, // list of receivers
    subject: subject, // Subject line
    text: textEmail, // plaintext body
    html: htmlEmail, // html body
  };

  smtpTransport.sendMail(mailOptions, function(error, response){
    if (error) {
      returnError += error + "\n";
      console.log(error);
    } else {
      console.log("Message sent: " + response.message);
    }
  });
}

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
  mail(receiver, subject, htmlEmail, textEmail);
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
  mail(receiver, subject, htmlEmail, textEmail);
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
  mail(email, subject, htmlEmail, textEmail);
}

exports.denyApplication = function(email, firstName) {
  var subject = "";
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
  mail(email, subject, htmlEmail, textEmail);
}
