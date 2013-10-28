// Logger

var fs = require('fs');

const DEBUG = 0;
const INFO = 1;
const WARN = 2;
const ERROR = 3;

var minOutputToFileLevel = INFO;
var minOutputToConsoleLevel = WARN;

Object.defineProperty(global, '__stack', {
  get: function(){
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack){ return stack; };
    var err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
  }
});

function log(level, message) {
  var stack = __stack[2];
  var fileName = stack.getFileName();
  fileName = fileName.substring(fileName.indexOf('nrd'));  // shorten path
  var lineNum = stack.getLineNumber();
  var time = new Date().toISOString();
  var output = time + " " + fileName + ":" + lineNum + " - " + message;
  if (level >= minOutputToFileLevel) {
    fs.appendFile('nextres.log', output + '\n', function(err) {});
  }
  if (level >= minOutputToConsoleLevel) {
    console.log(output);
  }
}

exports.debug = function(message) {
  log(DEBUG, message);
}
exports.info = function(message) {
  log(INFO, message);
}
exports.warn = function(message) {
  log(WARN, message);
}
exports.error = function(message) {
  log(ERROR, message);
}
