// req.params = {kerberos: [KERBEROS]}
exports.view = function(req, res) {
  if (req.params.kerberos 
      && nowTrolling.indexOf(req.params.kerberos) > -1
      && req.host === 'next.sexy') {
    res.render('peep.html', {resident : req.params.kerberos});
  } else {
    res.redirect('/');
  }
}
