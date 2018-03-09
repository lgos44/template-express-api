const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const secret = require('../config').secret;

const UserSchema = new mongoose.Schema({
    username:  {type: String, lowercase: true, unique: true, required: [true, "Can't be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true},
    email: {type: String, lowercase: true, unique: true, required: [true, "Can't be blank"], match: [/\S+@\S+\.\S+/, 'is invalid'], index: true},
    facebook: {
        id           : String,
        token        : String,
        name         : String,
        email        : String
    },
    bio: String,
    image: String,
    hash: String,
    salt: String,
    resetPasswordToken: String,
    resetPasswordExpiration: Date
}, {timestamps: true});

UserSchema.plugin(uniqueValidator, {message: 'Is already taken.'});

UserSchema.methods.validPassword = function(password) {
    let hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
    return this.hash === hash;
};

UserSchema.methods.setPassword = function(password){
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UserSchema.methods.generateJWT = function() {
    // TODO: put expiration time in configuration file
    return jwt.sign({
        id: this._id,
        username: this.username
    }, secret, { expiresIn: '1d' });
};

UserSchema.methods.toAuthJSON = function(){
    return {
        username: this.username,
        email: this.email,
        token: this.generateJWT(),
        bio: this.bio,
        image: this.image
    };
};

UserSchema.methods.toProfileJSONFor = function(user){
    return {
        username: this.username,
        bio: this.bio,
        image: this.image,
        following: user ? user.isFollowing(this._id) : false
    };
};

UserSchema.statics.upsertFbUser = function(accessToken, refreshToken, profile, cb) {
    const that = this;
    return this.findOne({'facebook.id': profile.id }, function(err, user) {
        // no user was found, lets create a new one
        if (!user) {
            const newUser = new that({
                username:  profile.name.givenName.replace(/\s/g, ''),
                email: profile.emails[0].value,
                facebook: {
                    id: profile.id,
                    token: accessToken
                }
            });
            newUser.save(function(error, savedUser) {
                if (error) {
                    console.log(error);
                }
                return cb(error, savedUser);
            });
        } else {
            return cb(err, user);
        }
    });
};

mongoose.model('User', UserSchema);
