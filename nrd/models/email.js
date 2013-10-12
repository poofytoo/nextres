var nodemailer = require('../node_modules/nodemailer');

function Email() {
  this.user = "sparkyroombot@gmail.com";
  this.password = "pencilpencil";
  this.service = "Gmail";
  this.from = "Next Resident Dashboard <sparkyroombot@gmail.com>";
}

Email.prototype.approveEmail = function(firstName, email) {
  var smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
      user: this.user,
      pass: this.password
    }
  });
  
  htmlEmail = "Hello " + firstName+ ", <br /><br />" + 
  "NextExec has approved your application for the small group project funding!<br /><br />"+
  "If you have any questions, feel free to contact nextres@mit.edu." +
  "<br /><br />" +
  "Cheers,<br />" +
  "NextExec";

  textEmail = "Hello, "+firstName+"NextExec has approved your application for the small group project funding! If you have any questions, feel free to contact nextres@mit.edu. Cheers, NextExec";

  var mailOptions = {
    from: this.from, // sender address
    to: email, // list of receivers
    subject: "Request for Project Funding Approved", // Subject line
    text: textEmail, // plaintext body
    html: htmlEmail // html body
  /*cc: 'nextexec@mit.edu' */
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

Email.prototype.denyEmail = function(firstName, email, reason) {
  var smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
      user: this.user,
      pass: this.password
    }
  });
  
  // var url = "http://mplcr.mit.edu";
  var htmlEmail = "Hello " + firstName+ ", <br /><br />" + 
  "NextExec has denied your application for the following reason(s): <br />" +
  reason +
  ".<br /><br />" +
  "You have the option to reapply and submit another funding proposal.<br /><br />" +
  "If you have any questions, feel free to contact nextres@mit.edu." +
  "<br /><br />" +
  "Cheers,<br />" +
  "NextExec";

  var textEmail = "Hello, " + firstName + "NextExec has denied your application for the following reason(s): " + reason + ". You have the option to reapply and submit another funding proposal. If you have any questions, feel free to contact nextres@mit.edu. Cheers, NextExec";

  var mailOptions = {
    from: this.from, // sender address
    to: email, // list of receivers
    subject: "Request for Project Funding Denied", // Subject line
    text: textEmail, // plaintext body
    html: htmlEmail // html body
    /*cc: 'nextexec@mit.edu' */
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

Email.prototype.resetPasswordEmail = function(rawPassword, kerberos) {
  var smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
      user: this.user,
      pass: this.password
    }
  });
  
  htmlEmail = "Hello,<br /><br />" + 
  "The password to your Next resident dashboard account has been reset. "+
  "Login with your kerberos ID and the following password: <b>" + rawPassword +
  "</b>. Once you have logged in, please change your password." +
  "<br /><br />" +
  "If you have any questions, feel free to contact nextres@mit.edu" +
  "<br /><br />" +
  "Cheers,<br />" +
  "Sparky, the Next House Mailbot";


  textEmail = "The password to your Next resident dashboard account has been reset. Login with your kerberos ID and the following password: " + rawPassword + "Once you have logged in, please change your password. If you have any questions, feel free to contact nextres@mit.edu. Cheers, Sparky, the Next House Mailbot";

  var mailOptions = {
    from: this.from, // sender address
    to: kerberos + "@mit.edu", // list of receivers
    subject: "Password Reset", // Subject line
    text: textEmail, // plaintext body
    html: htmlEmail // html body
  };
    
  smtpTransport.sendMail(mailOptions, function(error, response){
    if(error){
      returnError += error + "\n";
      console.log(error);
    } else {
      console.log("Message sent: " + response.message);
    }
  });
}

Email.prototype.newUserEmail = function(rawPassword, kerberos) {
  var smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
      user: this.user,
      pass: this.password
    }
  });
  
  // var url = "http://mplcr.mit.edu";
  htmlEmail = "Hello!<br /><br />" + 
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


  textEmail = "Hello! Your Next resident dashboard account has been created! Please go to <a href='next.mit.edu'>next.mit.edu</a>, and click the link on the top-right corner of the page. Login with your kerberos ID and the following password: " + rawPassword + "Once you have logged in, please change your password. If you have any questions, feel free to contact nextres@mit.edu. Cheers, Sparky, the Next House Mailbot";

  var mailOptions = {
    from: this.from, // sender address
    to: kerberos + "@mit.edu", // list of receivers
    subject: "Your Next Resident Dashboard Account", // Subject line
    text: textEmail, // plaintext body
    html: htmlEmail // html body
  };
    
  smtpTransport.sendMail(mailOptions, function(error, response){
    if(error){
      returnError += error + "\n";
      console.log(error);
    } else {
      console.log("Message sent: " + response.message);
    }
  });
}

module.exports = Email