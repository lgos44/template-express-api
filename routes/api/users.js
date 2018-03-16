const mongoose = require('mongoose');
const router = require('express').Router();
const passport = require('passport');
const User = mongoose.model('User');
const auth = require('../auth');
const async = require('async');
const mail = require('../../config/mail');
const config = require('../../config/config');
const crypto = require('crypto');

router.get('/user', auth.required, function(req, res, next){
    User.findById(req.payload.id).then(function(user){
        if(!user){ return res.sendStatus(401); }

        return res.json({user: user.toAuthJSON()});
    }).catch(next);
});

router.put('/user', auth.required, function(req, res, next){
    User.findById(req.payload.id).then(function(user){
        if(!user){ return res.sendStatus(401); }

        // only update fields that were actually passed...
        if(typeof req.body.user.username !== 'undefined'){
            user.username = req.body.user.username;
        }
        if(typeof req.body.user.email !== 'undefined'){
            user.email = req.body.user.email;
        }
        if(typeof req.body.user.bio !== 'undefined'){
            user.bio = req.body.user.bio;
        }
        if(typeof req.body.user.image !== 'undefined'){
            user.image = req.body.user.image;
        }
        if(typeof req.body.user.password !== 'undefined'){
            user.setPassword(req.body.user.password);
        }

        return user.save().then(function(){
            return res.json({user: user.toAuthJSON()});
        });
    }).catch(next);
});

router.post('/login', function(req, res, next){
    if(!req.body.user.email){
        return res.status(422).json({errors: {email: "Can't be blank"}});
    }

    if(!req.body.user.password){
        return res.status(422).json({errors: {password: "Can't be blank"}});
    }

    passport.authenticate('local-login', {session: false}, function(err, user, info){
        if(err){ return next(err); }

        if(user){
            user.token = user.generateJWT();
            return res.json({user: user.toAuthJSON()});
        } else {
            return res.status(422).json(info);
        }
    })(req, res, next);
});

// send to facebook to do the authentication
router.get('/login/facebook', passport.authenticate('facebook-token', { session: false }),  function(req, res, next) {
    const user = req.user;
    if (!user) {
        return res.send(401, 'User Not Authenticated');
    } else {
        user.token = user.generateJWT();
        return res.json({user: user.toAuthJSON()});
    }
});

router.post('/forgot-password', function (req, res, next) {
    async.waterfall([
        function(done) {
            User.findOne({
                email: req.body.email
            }).exec(function(err, user) {
                if (user) {
                    done(err, user);
                } else {
                    done('User not found.');
                }
            });
        },
        function(user, done) {
            // create the random token
            crypto.randomBytes(20, function(err, buffer) {
                const token = buffer.toString('hex');
                done(err, user, token);
            });
        },
        function(user, token, done) {
            User.findByIdAndUpdate({ _id: user._id }, { resetPasswordToken: token, resetPasswordExpiration: Date.now() + 86400000 }, { upsert: true, new: true }).exec(function(err, new_user) {
                done(err, token, new_user);
            });
        },
        function(token, user, done) {
            const data = {
                to: user.email,
                from: config.mailConfig.auth.user,
                template: 'password-reset',
                subject: 'Password reset',
                context: {
                    url: 'http://localhost:9000/reset_password?token=' + token,
                    name: user.username
                }
            };

            mail.sendMail(data, function(err) {
                if (!err) {
                    return res.json({ message: 'Check your email for further instructions.' });
                } else {
                    return done(err);
                }
            });
        }
    ], function(err) {
        return res.status(422).json({ message: err });
    });

});

router.post('/reset-password', function (req, res, next) {
    User.findOne({
        resetPasswordToken: req.body.token
    }).exec(function(err, user) {
        if (!err && user) {
            if (req.body.newPassword === req.body.verifyPassword) {
                user.setPassword(req.body.newPassword);
                user.resetPasswordToken = undefined;
                user.resetPasswordExpiration = undefined;
                user.save(function(err) {
                    if (err) {
                        return res.status(422).send({
                            message: err
                        });
                    } else {
                        const data = {
                            to: user.email,
                            from: config.mailConfig.auth.user,
                            template: 'password-success',
                            subject: 'Password Reset Confirmation',
                            context: {
                                name: user.username
                            }
                        };

                        mail.sendMail(data, function(err) {
                            if (!err) {
                                return res.json({ message: 'Password reset' });
                            } else {
                                return done(err);
                            }
                        });
                    }
                });
            } else {
                return res.status(422).send({
                    message: 'Passwords do not match'
                });
            }
        } else {
            return res.status(400).send({
                message: 'Password reset token is invalid or has expired.'
            });
        }
    });
});


router.post('/users', function(req, res, next){
    const user = new User();

    user.username = req.body.user.username;
    user.email = req.body.user.email;
    user.setPassword(req.body.user.password);

    user.save().then(function(){
        return res.json({user: user.toAuthJSON()});
    }).catch(next);
});

module.exports = router;
