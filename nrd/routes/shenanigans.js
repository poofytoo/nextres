// req.params = {kerberos: [KERBEROS]}
var nowTrolling = ['kyc2915', 'normandy', 'fishr', 'dontony', 'trzhang', 'hguarino', 'stalyc'];

exports.view = function(req, res) {
  if (req.params.kerberos 
      && nowTrolling.indexOf(req.params.kerberos) > -1
      && req.host === 'next.sexy') {
    var data = {};
    data[req.params.kerberos] = true;
    res.render('peep.html', data);
  } else {
    res.redirect('/');
  }
}
