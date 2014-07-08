// req.params = {kerberos: [KERBEROS]}
exports.view = function(req, res) {
  if (req.params.kerberos 
      && (req.host === 'next.sexy' || req.host === 'localhost')) {
    res.render('peep.html', {resident : req.params.kerberos});
  } else {
    res.redirect('/');
  }
}
