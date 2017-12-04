/*
 * Get config information from config.json
 */

var fs = require('fs');
var path = require('path');

const CONFIG_FILE = path.join(__dirname, '../config.json');

if (!fs.existsSync(CONFIG_FILE)) {
    throw new Error("Config file config.json not found");
}

data = fs.readFileSync(CONFIG_FILE);
exports.config_data = JSON.parse(data);
exports.isWindows = /^win/i.test(process.platform);
