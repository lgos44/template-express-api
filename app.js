const express = require('express');
const expressValidator = require('express-validator');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('passport');
const errorhandler = require('errorhandler');
const config = require('./config/config').config;
const session = require('express-session');
const mongoose = require('mongoose');

const isProduction = process.env.NODE_ENV === 'production';

const app = express();

app.disable('x-powered-by');
app.disable('view cache');

// Add headers
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    // TODO Change later
    res.setHeader('Access-Control-Allow-Origin', "*");
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader("Access-Control-Allow-Headers", "Authorization, X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept");

    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    // Pass to next layer of middleware
    next();
});

app.use(expressValidator());
app.use(cookieParser('secret'));
app.use(bodyParser.json({limit: '2mb'}));
app.use(bodyParser.urlencoded({extended: true, limit: '2mb'}));
app.use(morgan('short'));
app.use(passport.initialize());
app.use(passport.session());

app.use(require('method-override')());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'conduit', cookie: { maxAge: 60000 }, resave: false, saveUninitialized: false  }));

if (!isProduction) {
    app.use(errorhandler());
}

mongoose.connect(config.mongoUri);
mongoose.set('debug', config.debug);

require('./models/User');
require('./config/passport')(passport);
app.use(require('./routes'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (!isProduction) {
    app.use(function(err, req, res, next) {
        console.log(err.stack);

        res.status(err.status || 500);

        res.json({'errors': {
            message: err.message,
            error: err
        }});
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({'errors': {
        message: err.message,
        error: {}
    }});
});



module.exports = app;
