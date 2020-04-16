module.exports = db => {
    return {
        requireAuthentication: (req, res, next) => {
            const token = req.get('Auth');
            db.user.findByToken(token).then(user => {
                req.user = user;
                next();
            }, error => {
                res.status(401).json({
                    "Error": "Error getting Auth token. Please sign in."
                });
            });
        }
    };
};