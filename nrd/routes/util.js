var fs = require('fs');
var hbs = require('hbs');

exports.registerContent = function (content) {
  var contentDir = __dirname.substring(0, __dirname.lastIndexOf('/'));
  var contentDir = contentDir + '/views/partials/' + content + '.html';
  var content = fs.readFileSync(contentDir, 'utf8');
  hbs.registerPartial('content', content);
}

exports.randomPassword = function() {
  var text = "";
  var possible = "abcdefghjkmnpqrstuvwxyz23456789";
  for (var i=0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}