// load all the things we need
const LocalStrategy    = require('passport-local').Strategy;
const FacebookTokenStrategy = require('passport-facebook-token');
const mongoose = require('mongoose');
const User = mongoose.model('User');


// load the auth variables
const configAuth = require('./config');

module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and deserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    /**
     * Local login strategy
     */
    passport.use('local-login', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'user[email]',
            passwordField: 'user[password]',
            passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
        }, function(req, email, password, done) {
            if (email)
                email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching
            User.findOne({email: email}).then(function(user){
                if(!user || !user.validPassword(password)){
                    return done(null, false, {errors: {'email or password': 'is invalid'}});
                }
                return done(null, user);
            }).catch(done);
        }));

    /**
     * Facebook token strategy (OAuth2)
     */
    const fbStrategy = configAuth.facebookAuth;
    //fbStrategy.passReqToCallback = true;  // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    passport.use('facebook-token', new FacebookTokenStrategy(fbStrategy, function (accessToken, refreshToken, profile, done) {
        console.log(profile);
        User.upsertFbUser(accessToken, refreshToken, profile, function(err, user) {
            return done(err, user);
        });
    }));
};
