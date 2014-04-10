var fs = require('fs');
var hbs = require('hbs');
var pm = require('../models/permissions').Permissions;

// Cache for reading partial files.
var CACHE = {};

function registerContent(page) {
  if (!CACHE.page) {
    var contentDir = __dirname.substring(0, __dirname.lastIndexOf('/'));
    var contentFile = contentDir + '/views/partials/' + page + '.html';
    var contents = fs.readFileSync(contentFile, 'utf8');
    CACHE[page] = contents;
  }
  hbs.registerPartial('content', CACHE[page]);
}

/*
 * Render the given page.
 * This function adds boilerplate and permissions information.
 */
exports.render = function(res, page, params) {
  registerContent(page);
  if (params.user) {
    params.permissions = pm.getPermissions(params.user.group);
  }
  res.render('base.html', params);
}

/*
 * Get rid of bad characters in params[field], and truncates the string
 *   to at most the specified limit length. Used for sanitizing user inputs.
 */
exports.sanitize = function(params, field, badChars, limit) {
  params[field] = params[field] || '';
  params[field] = params[field].replace(badChars, '').substring(0, limit);
}
