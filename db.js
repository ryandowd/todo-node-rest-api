// Load sequelize so that we can query the DB
const Sequelize = require('sequelize');
// Set the envrionment either for development or production (i.e. heroku etc)
const env = process.env.NODE_ENV || 'development';
let sequelize;

// Then we check the environment
// If production
if (env === 'production') {
    // And set sequelize to query a 'Postgres' DB if it is 'heroku'
    // NOTE: We have created a Postgres app on heroku
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres' // This is why we set as 'postgres'
    });
    // Else, if development, then we use 'sqlite' as the DB
} else {
    sequelize = new Sequelize(undefined, undefined, undefined, {
        'dialect': 'sqlite',
        'storage': __dirname + '/data/dev-todo-api.sqlite' // and we tell it where the DB is stored
    });
}

// The DB object contains all of the models
let db = {};

// We import all of the models here
db.todo = sequelize.import(__dirname + '/models/todo.js');
db.user = sequelize.import(__dirname + '/models/user.js');
db.token = sequelize.import(__dirname + '/models/token.js');

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// This sets up relationships (called 'Associations' in sequelize terms) between the 
// models of data.
// This basically says that each 'todo' DB instance will belong to only one 'user' instance
db.todo.belongsTo(db.user);
// And this basically says that each 'user' instance can have many different 'todo's
db.user.hasMany(db.todo);

// Export that so it can be loaded in the other file
module.exports = db;