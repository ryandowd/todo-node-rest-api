const bcrypt = require('bcrypt');
const _ = require('underscore');
const cryptojs = require('crypto-js');
const jwt = require('jsonwebtoken');

module.exports = (sequelize, DataTypes) => {
    const user = sequelize.define('user', {
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        salt: {
            type: DataTypes.STRING
        },
        password_hash: {
            type: DataTypes.STRING
        },
        password: {
            type: DataTypes.VIRTUAL,
            allowNull: false,
            validate: {
                len: [7, 100]
            },
            set: function (value) {
                const salt = bcrypt.genSaltSync(10);
                const hashedPassword = bcrypt.hashSync(value, salt);

                this.setDataValue('password', value);
                this.setDataValue('salt', salt);
                this.setDataValue('password_hash', hashedPassword);
            }
        }
    }, {
        hooks: {
            beforeValidate: user => {
                if (typeof user.email === 'string') {
                    user.email = user.email.toLowerCase();
                }
            }
        }
    });

    user.prototype.toPublicJSON = function () {
        var json = this.toJSON();
        return _.pick(json, 'id', 'email', 'createdAt', 'updatedAt');
    };

    user.prototype.generateToken = function (type) {
        if (!_.isString(type)) {
            return undefined;
        }

        try {
            const stringData = JSON.stringify({ id: this.get('id'), type: type });
            const encryptedData = cryptojs.AES.encrypt(stringData, 'abc123').toString();
            const token = jwt.sign({
                token: encryptedData
            }, 'helloRyan');

            return token;
        } catch (e) {
            return undefined;
        }
    };

    user.authenticate = function (body) {
        return new Promise((resolve, reject) => {
            if (typeof body.email !== 'string' && typeof body.password !== 'string') {
                return reject();
            }

            user.findOne({
                where: {
                    email: body.email
                }
            }).then(user => {
                if (!user || !bcrypt.compareSync(body.password, user.get('password_hash'))) {
                    return reject();
                } else {
                    resolve(user);
                }
            }, error => {
                reject();
            });
        });
    };

    user.findByToken = token => {
        return new Promise((resolve, reject) => {
            try {
                const decodedJWT = jwt.verify(token, 'helloRyan');
                const bytes = cryptojs.AES.decrypt(decodedJWT.token, 'abc123');
                const tokenData = JSON.parse(bytes.toString(cryptojs.enc.Utf8));
                user.findByPk(tokenData.id).then(user => {
                    console.log(user, 'user user user user');
                    if (user) {
                        resolve(user);
                    } else {
                        reject();
                    }
                }, error => {
                    reject(error);
                });
            } catch (e) {
                reject();
            }
        });
    };

    return user;
}