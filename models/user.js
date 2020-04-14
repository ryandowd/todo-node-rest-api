module.exports = (sequelize, DataTypes) => {
    return sequelize.define('user', {
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [7, 100]
            }
        }
    }, {
        hooks: {
            beforeValidate: user => {
                if (typeof user.email === 'string') {
                    console.log('is string');
                    user.email = user.email.toLowerCase();
                }
            }
        }
    });
}