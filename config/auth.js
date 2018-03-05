// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

    'facebookAuth' : {
        'clientID'        : 'clientID', // your App ID
        'clientSecret'    : 'clientSecret', // your App Secret
        'callbackURL'     : 'http://localhost:9000/api/login/facebook/callback',
        'profileURL'      : 'https://graph.facebook.com/v2.5/me?fields=first_name,last_name,email',
        'profileFields'   : ['id', 'email', 'name'] // For requesting permissions from Facebook API
    }

};
