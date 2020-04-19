// Load the cryptojs module so that we can encrypt the token
const cryptojs = require('crypto-js');

// The model for the 'token' database entries
// The token is used to authenticate the user so that they can
// make authenticated calls to the server and get/set the right data
module.exports = (sequelize, DataTypes) => {
    // Returns a 'sequelize' definition of the 'token' object
    return sequelize.define('token', {
        // Key 'token'. This gets set in the 'set' function below'
        token: {
            // 'VIRTUAL' datatype means that it is not stored in the DB
            // But it is still returned to the user. It exists on the server level (I think)
            type: DataTypes.VIRTUAL,
            // Make it required
            allowNull: false,
            // Set valid length to min 1 char. 
            // Basically this just helps us validate that it is not blank
            validate: {
                len: [1]
            },
            // Here we use the 'set' function to make sure that, upon it being set,
            // we change the value of the token by encrypting it with an MD5 encryption
            set: function (value) {
                const hash = cryptojs.MD5(value).toString();
                // We then save the original token.
                // Uses 'setDataValue' which needs to be called on 'this'
                this.setDataValue('token', value);
                // And we also save the hashed token
                // Uses 'setDataValue' which needs to be called on 'this'
                this.setDataValue('tokenHash', hash);
            }
        },
        // Key 'tokenHash'. This gets set in the 'set' function above 
        tokenHash: DataTypes.STRING
    });
}