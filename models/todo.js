// The model for the 'todos' database entries
module.exports = (sequelize, DataTypes) => {
    // Returns a 'sequelize' definition of the 'todo' object
    return sequelize.define('todo', {
        // Description (i.e. the text for what is todo)
        description: {
            // Set the type
            type: DataTypes.STRING,
            // Make sure it is required
            allowNull: false,
            // Set a valid length
            validate: {
                len: [1, 250]
            }
        },
        // A boolean of 'completed' or not
        completed: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    });
}