const express = require('express');
const sequelize = require('sequelize');
const bodyParser = require('body-parser');
const _ = require('underscore');
const db = require('./db.js');
const middleware = require('./middleware.js')(db);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// GET /index
app.get('/', (req, res) => {
  res.send('TODO API ROOT');
});

console.log('MIDDLEWARE:', middleware.requireAuthentication);

// GET /todos?completed=boolean&q=work
app.get('/todos', middleware.requireAuthentication, (req, res) => {
  const query = req.query;
  let whereObj = {
    userId: req.user.get('id')
  };

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
app.get('/todos/:id', middleware.requireAuthentication, (req, res) => {
  const todoId = parseInt(req.params.id);
  db.todo.findOne({
    where: {
      id: todoId,
      userId: req.user.get('id')
    }
  }).then(todo => {
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
app.post('/todos', middleware.requireAuthentication, (req, res) => {
  const body = _.pick(req.body, 'completed', 'description');
  body.description = body.description.trim();

  // Send to the DB with sequelize
  db.todo.create(body).then(todo => {
    req.user.addTodo(todo).then(() => {
      return todo.reload();
    }).then(todo => {
      res.json(todo.toJSON());
    })
  }, error => {
    res.status(400).json(error);
  });
});

// DELETE /todos/:id
app.delete('/todos/:id', middleware.requireAuthentication, (req, res) => {
  const todoId = parseInt(req.params.id);

  db.todo.destroy({
    where: {
      id: todoId,
      userId: req.user.get('id')
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
app.put('/todos/:id', middleware.requireAuthentication, (req, res) => {
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

  db.todo.findOne({
    where: {
      id: todoId,
      userId: req.user.get('id')
    }
  }).then(todo => {
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

// POST /users
app.post('/users', (req, res) => {
  const body = _.pick(req.body, 'email', 'password');
  db.user.create(body).then(user => {
    res.json(user.toPublicJSON());
  }, error => {
    res.status(401).json({
      "Error": error
    });
  });
});

// POST /users/login
app.post('/users/login', (req, res) => {
  const body = _.pick(req.body, 'email', 'password');
  let userInstance;

  db.user.authenticate(body).then(user => {
    const jwToken = user.generateToken('authentication');

    userInstance = user;
    return db.token.create({
      token: jwToken
    });
  }).then(tokenInstance => {
    res.header('Auth', tokenInstance.get('token')).json(userInstance.toPublicJSON());
  }).catch(error => {
    res.status(401).json({
      "Error": error
    });
  });

});

// DELETE /users/login
app.delete('/users/login', middleware.requireAuthentication, (req, res) => {
  req.token.destroy().then(() => {
    res.status(204).send();
  }).catch(() => {
    res.status(500).send();
  })
})

// NOTE: Passing the {force:true} object to .sync() forces the DB to recreate (i.e. drop old tables, and start fresh)
// This is useful if there are changes being made to the DB that need to override/add 
// to the existing schema/setup. E.g. When adding salted/hashed passwords to the user model. 
db.sequelize.sync({
  force: true
}).then(() => {
  app.listen(PORT, () => {
    console.log('Express listening on port ' + PORT + '!');
  });
})
