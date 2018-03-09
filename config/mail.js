const hbs = require('nodemailer-express-handlebars');
const nodemailer = require('nodemailer');
const config = require('./config').config;
const path = require('path');

const smtpTransport = nodemailer.createTransport(config.mailConfig);


const handlebarsOptions = {
    viewEngine: 'handlebars',
    viewPath: path.resolve('./templates/'),
    extName: '.html'
};

smtpTransport.use('compile', hbs(handlebarsOptions));

module.exports = smtpTransport;