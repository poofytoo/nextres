var exec = require('child_process').exec;

exports.validate = function(kerberos, allowEmpty, callback) {
  kerberos = kerberos.replace(/[^a-zA-Z0-9\-_ ]/g, "");
  if (kerberos === '') {
    callback(kerberos, allowEmpty);
  }
  exec('finger ' + kerberos + '@athena.dialup.mit.edu',
      function(error, stdout, stderr) {
        callback(kerberos, stdout.indexOf('no such user.') == -1);
      });
}
