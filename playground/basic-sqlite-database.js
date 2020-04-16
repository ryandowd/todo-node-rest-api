const Sequelize = require('sequelize');
const sequelize = new Sequelize(undefined, undefined, undefined, {
    'dialect': 'sqlite',
    'storage': __dirname + '/basic-sqlite-database.sqlite'
});

const Todo = sequelize.define('todo', {
    description: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            len: [1, 250]
        }
    },
    completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
});

const User = sequelize.define('user', {
    email: Sequelize.STRING,
});

Todo.belongsTo(User);
User.hasMany(Todo);

sequelize.sync({
    // force: true
}).then(() => {
    console.log('Everything is synced');

    User.findByPk(1).then(user => {
        user.getTodos({
            where: {
                completed: false
            }
        }).then(todos => {
            todos.map(todo => {
                console.log(todo.toJSON());
            });
        });
    });

    // User.create({
    //     email: "r@dowd.com"
    // }).then(() => {
    //     return Todo.create({
    //         description: "Water plants"
    //     });
    // }).then(todo => {
    //     User.findByPk(1).then(user => {
    //         user.addTodo(todo);
    //     });
    // });
});
