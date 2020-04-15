const express = require('express');
const { Op } = require('sequelize');
const sequelize = require('sequelize');
const bodyParser = require('body-parser');
const _ = require('underscore');
const db = require('./db.js');
const app = express();
const PORT = process.env.PORT || 3000;
let todos = [
  {
    "completed": false,
    "description": "111",
    "id": 1
  },
  {
    "completed": false,
    "description": "1232311",
    "id": 2
  },
  {
    "completed": true,
    "description": "1244432311",
    "id": 3
  }
];

app.use(bodyParser.json());

// GET /index
app.get('/', (req, res) => {
  res.send('TODO API ROOT');
});

// GET /todos?completed=boolean&q=work
app.get('/todos', (req, res) => {
  const query = req.query;
  let whereObj = {};

  if (query.hasOwnProperty('completed')) {
    const completedBool = query.completed === 'true' ? true : false;
    whereObj.completed = completedBool;
  }


  if (query.hasOwnProperty('q') && query.q.length > 0) {
    whereObj.description = sequelize.where(sequelize.fn('LOWER', sequelize.col('description')), 'LIKE', '%' + query.q.trim().toLowerCase() + '%')
  }

  db.todo.findAll({ where: whereObj }).then(todos => {
    res.json(todos);
  }, error => {
    res.status(500).json(
      { "Error": 'Could not find a matching todo' }
    );
  });
});

// GET todo/:id
app.get('/todos/:id', (req, res) => {
  const todoId = parseInt(req.params.id);

  db.todo.findByPk(todoId).then(todo => {
    if (!!todo) {
      res.json(todo.toJSON());
    } else {
      res.status(404).json(
        { "Error": 'Could not find todo with that ID' }
      );
    }
  }, error => {
    res.status(500).json(
      { "Server Error": 'Something is wrong witht the server' }
    );
  });
});

// POST /todos
app.post('/todos', (req, res) => {
  const body = _.pick(req.body, 'completed', 'description');
  body.description = body.description.trim();

  // Send to the DB with sequelize
  db.todo.create(body).then(todo => {
    res.json(todo.toJSON());
  }, error => {
    res.status(400).json(error);
  });
});

// POST /users
app.post('/users', (req, res) => {
  const body = _.pick(req.body, 'email', 'password');
  db.user.create(body).then(user => {
    res.json(user.toPublicJSON());
  }, error => {
    res.status(400).json(error);
  });
});

// DELETE /todos/:id
app.delete('/todos/:id', (req, res) => {
  const todoId = parseInt(req.params.id);

  db.todo.destroy({
    where: {
      id: todoId
    }
  }).then(todos => {
    if (todos > 0) {
      res.status(204).send();
    } else {
      res.status(404).send('Nothing deleted because no todo with ID:' + todoId + ' exists');
    }
  }, error => {
    res.status(500).json(
      { "Server Error": 'There was an error with the server' }
    );
  });
});

// PUT /todos/:id
app.put('/todos/:id', (req, res) => {
  const body = _.pick(req.body, 'completed', 'description');
  const hasCompleted = body.hasOwnProperty('completed');
  const hasDescription = body.hasOwnProperty('description');
  const todoId = parseInt(req.params.id);
  const attrs = {};

  // 'Field: Completed'
  if (hasCompleted) {
    attrs.completed = body.completed;
  }

  // 'Field: Description'
  if (hasDescription && body.description.length > 0) {
    attrs.description = body.description.trim();
  }

  db.todo.findByPk(todoId).then(todo => {
    if (todo) {
      todo.update(attrs).then(todo => {
        res.json(todo.toJSON());
      }, error => {
        res.status(400).json(error);
      });
    } else {
      res.status(404).send();
    }
  }, error => {
    res.status(500).json(error);
  });

});

// NOTE: Passing the {force:true} object to .sync() forces the DB to recreate (i.e. drop old tables, and start fresh)
// This is useful if there are changes being made to the DB that need to override/add 
// to the existing schema/setup. E.g. When adding salted/hashed passwords to the user model. 
db.sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log('Express listening on port ' + PORT + '!');
  });
})
