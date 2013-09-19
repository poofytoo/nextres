
/*
 * GET home page.
 */

// fuck this jade shit
exports.index = function(req, res){
  res.render('index', { title: 'Express' });
};