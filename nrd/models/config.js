/*
 * Get config information from config.json
 */

var fs = require('fs');

const CONFIG_FILE = 'config.json';

if (!fs.existsSync(CONFIG_FILE)) {
    throw new Error("Config file config.json not found");
}

data = fs.readFileSync(CONFIG_FILE, {'encoding': 'utf8'});
json_data = JSON.parse(data);
exports.config_data = json_data;
