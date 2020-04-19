// Load bcrypt, used to salt & encrypt the password
const bcrypt = require('bcrypt');
// Load underscore js helper
const _ = require('underscore');
// Load cryptojs to encrypt/decrypt tokens for authenitcation
const cryptojs = require('crypto-js');
// Load the json web token module for use with the tokens
const jwt = require('jsonwebtoken');

// The model for the 'user' database entries
module.exports = (sequelize, DataTypes) => {
    // Uses define to create the 'user' model table in the DB
    const user = sequelize.define('user', {
        // Has an email attribute
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true, // Needs to be unique
            validate: { // Also use built-in sequelize email validation
                isEmail: true
            }
        },
        // The 'salt' is the string that is used in encryption.
        // It basically makes sure that, even if any two users passwords are the same,
        // the entry in the DB will not be the same because they have had a unique 'salt'
        // string 'mixed into them' during the encryption process. This is an extra level of
        // security that prevents bad actors from hacking passwords. 
        salt: {
            type: DataTypes.STRING
        },
        // This is the encrypted password after it has been hashed
        password_hash: {
            type: DataTypes.STRING
        },
        // The original password. Note how it is of DataType 'VIRTUAL'. Therefore, it is
        // NOT stored in the DB and only exists as virtual data on the server
        password: {
            type: DataTypes.VIRTUAL,
            allowNull: false,
            validate: {
                len: [7, 100]
            },
            // Upon execution of the 'save', this 'set' function salts/encrypts the password
            // And stores it to the respective keys on this model for later use
            set: function (value) {
                const salt = bcrypt.genSaltSync(10);
                const hashedPassword = bcrypt.hashSync(value, salt);

                this.setDataValue('password', value);
                this.setDataValue('salt', salt);
                this.setDataValue('password_hash', hashedPassword);
            }
        }
    }, {
        // This is a helper hooker function that essentially sets the email to lowercase for better
        // usability. (i.e. The user doesn't have to worry about a case-sensitive email). This method
        // is superceded by the 'authenticate' class-based function (see further below). Only keeping 
        // here for legacy.
        hooks: {
            beforeValidate: user => {
                if (typeof user.email === 'string') {
                    user.email = user.email.toLowerCase();
                }
            }
        }
    });

    // This creates an 'instance-based' function (i.e. it is a method that exists on the 'user' object and 
    // can be called directly using user.toPublicJSON() for that specific instance created). This func is 
    // used to return only non-sensitive data in the returned JSON objects. This also prevents bad-actors 
    // from obtaining passwords etc.
    user.prototype.toPublicJSON = function () {
        var json = this.toJSON();
        // It works by using the 'underscore' utility 'pick' which filters only the 
        // params that you want to add (i.e. that are not sensitive, like the password hash etc)
        return _.pick(json, 'id', 'email', 'createdAt', 'updatedAt');
    };

    // This creates an 'instance-based' function which creates the auth token
    user.prototype.generateToken = function (type) {
        // In the case of this project, the only type is 'authentication' 
        // But essentially this just makes sure function is being used as expected
        // (i.e. to generate an authentication token)
        if (!_.isString(type)) {
            return undefined;
        }

        // Uses a try/catch
        try {
            // To create a string from this users ID. Hence why a standard 'function' and not an
            // arrow function is used so that the 'this' object can refer to the user. Uses .get() to
            // grab the ID from the user object. Then creates the string. The reason we use 'stringify' 
            // is because cryptojs only encrypts strings - it cannot encrypt a non-string (i.e. an object)
            const stringData = JSON.stringify({ id: this.get('id'), type: type });
            // We then user cryptojs.AES encryption, and pass a random 2nd param string of 'abc123' so that it can
            // use this to make the hashed token string. 
            const encryptedData = cryptojs.AES.encrypt(stringData, 'abc123').toString();
            // We then use JWT to 'sign' (i.e. create) the auth token, and also pass in a random 2nd param as a modifier 
            // for the thingy. This is so the user can be validated through the session. I dunno... I need to look into this more.
            const token = jwt.sign({
                token: encryptedData
            }, 'helloRyan');

            return token;
        } catch (e) {
            return undefined;
        }
    };

    // This creates a 'class-based' function that exists on the whole 'db.user' object (and not on the instance).
    // It is used during login, and takes the entered password and compares it to the decrypted password hash.
    user.authenticate = function (body) {
        // This function returns a promise which can resolve or reject depending on if the password matches
        // or if something else goes wrong. 
        return new Promise((resolve, reject) => {
            // First reject if the password or email are NOT a string
            if (typeof body.email !== 'string' && typeof body.password !== 'string') {
                return reject();
            }

            // Uses the sequelize method 'findOne' to only get 1 DB user entry
            user.findOne({
                // Where the email matches the one passed in
                where: {
                    email: body.email
                }
                // findOne() is a promise, so if/when that resolves
            }).then(user => {
                // If the password and decrypted password_hash don't match
                if (!user || !bcrypt.compareSync(body.password, user.get('password_hash'))) {
                    return reject(); // Then reject
                } else {
                    resolve(user); // Or resolve, and pass the use through with the promise data
                }
                // Else if something is really screwed, just reject().
            }, error => {
                reject();
            });
        });
    };

    // This creates a 'class-based' function that exists on the whole 'db.user' object (and not on the instance).
    // It is used during any authentication-level action (i.e. Post todo, Get todos, Put todo etc)
    user.findByToken = token => {
        // This function returns a promise
        return new Promise((resolve, reject) => {
            try {
                // Use JWT an decode the token using 'verify'
                const decodedJWT = jwt.verify(token, 'helloRyan');
                // Then decrypt the token using the random string. 
                // This will give a decrypted string that contains the users ID
                const bytes = cryptojs.AES.decrypt(decodedJWT.token, 'abc123');
                // Then turn that string into an object so we can access the string
                const tokenData = JSON.parse(bytes.toString(cryptojs.enc.Utf8));
                // Then use the sequelize method 'findByPk()', pass it the ID, and get the user
                user.findByPk(tokenData.id).then(user => {
                    // If we find one, then pass resolve and the user
                    if (user) {
                        resolve(user);
                    } else {
                        reject(); // Else reject
                    }
                }, error => {
                    reject(error); // Else if findByPk has an error then we reject
                });
                // Or is all fails, then reject
            } catch (e) {
                reject();
            }
        });
    };

    // Return the user model obj
    return user;
}