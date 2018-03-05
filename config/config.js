let conf = require('./config.json')[process.env.NODE_ENV || 'development'];

module.exports.config = conf;