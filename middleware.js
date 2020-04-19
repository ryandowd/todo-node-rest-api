const cryptojs = require('crypto-js');

// This 'middleware' holds a func which is used to check that the user has a 
// valid token. Therefore we can make sure that the valid user is making the CRUD requests. 
// This is triggered before each CRUD request. See server.js endpoints. 
module.exports = db => {
    return {
        requireAuthentication: (req, res, next) => {
            // Gets the Auth token from the request
            const token = req.get('Auth') || '';

            // We then search the DB 'token' table for that Auth token
            db.token.findOne({
                // Where the Auth token matches the encrypted token in the DB
                where: {
                    tokenHash: cryptojs.MD5(token).toString()
                }
                // IF it's found then its a valid user
            }).then(tokenInstance => {
                // IF NOT found then throw error
                if (!tokenInstance) {
                    throw new Error;
                }
                req.token = tokenInstance;
                return db.user.findByToken(token);
            }).then(user => {
                req.user = user;
                next();
            }).catch(error => {
                res.status(401).json({
                    "Error": error
                });
            });
        }
    };
};