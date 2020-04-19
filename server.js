// Load express so we can use create the server
const express = require('express');
// Load the sequelize module so we can use it's methods to query the DB
const sequelize = require('sequelize');
// Load bodyParser middleware to parse node requests
const bodyParser = require('body-parser');
// Load underscore to use it's utilities
const _ = require('underscore');

// Load in the DB. The DB file contains all of the DB (and model scheme) setup
const db = require('./db.js');
// Load the middleware function and passes it the DB. This middleware has a function which 
// is used in the CRUD events to authenticiate the user each time a CRUD request is made.
// We pass it the DB so that it has access to the stored token hashes and other stuff
const middleware = require('./middleware.js')(db);
// Then create the express app
const app = express();
// Define the ports (use env ports if available - i.e. if this code is running on a non-dev env)
const PORT = process.env.PORT || 3000;

// I don't know what this line does... more hooking things up? 
app.use(bodyParser.json());

/*
 * NOW WE HAVE ALL OF OUR NODE ROUTE ENDPOINTS
 */

// GET /index
app.get('/', (req, res) => {
  res.send('TODO API ROOT');
});

// GET /todos?completed=boolean&q=work
// NOTE: We also call the 'middleware.requireAuthentication' func to FIRST
// check that the user has a valid token before doing the action
app.get('/todos', middleware.requireAuthentication, (req, res) => {
  const query = req.query;
  // The 'whereObj' is just an obj we pass to the sequelize method findAll(). 
  // It is used to filter out only the instances 'where' = match etc. 
  let whereObj = {
    userId: req.user.get('id')
  };

  // IF the request has a key of 'completed' 
  if (query.hasOwnProperty('completed')) {
    // Then update the 'where' match obj
    const completedBool = query.completed === 'true' ? true : false;
    whereObj.completed = completedBool;
  }

  // IF the reques has a key of 'q'
  if (query.hasOwnProperty('q') && query.q.length > 0) {
    // Then update the whereObj. NOTE: we pass it a more complex custom .where() command so that we can 
    // contruct a more specific query. E.g, we use the 'LIKE' %word% query so we can do a non-exact string search
    whereObj.description = sequelize.where(sequelize.fn('LOWER', sequelize.col('description')), 'LIKE', '%' + query.q.trim().toLowerCase() + '%')
  }

  // We then use the sequelize method 'findAll()' which is a promise
  db.todo.findAll({ where: whereObj }).then(todos => {
    // If success, then show the todos
    res.json(todos);
  }, error => {
    res.status(500).json(
      { "Error": 'Could not find a matching todo' }
    );
  });
});

// GET todo/:id - This returns only 1 todo by using the ID that was passed
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

// POST /todos - This is for creating new todos
app.post('/todos', middleware.requireAuthentication, (req, res) => {
  const body = _.pick(req.body, 'completed', 'description');
  body.description = body.description.trim();

  // Send to the DB with sequelize
  db.todo.create(body).then(todo => {
    req.user.addTodo(todo).then(() => {
      // We use 'reload' so that the todo will be updated with the 
      // updated data
      return todo.reload();
    }).then(todo => {
      res.json(todo.toJSON()); // Then we show it
    })
  }, error => {
    res.status(400).json(error);
  });
});

// DELETE /todos/:id
app.delete('/todos/:id', middleware.requireAuthentication, (req, res) => {
  const todoId = parseInt(req.params.id);

  // Find the TODO by ID and destroy it from the DB
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

// PUT /todos/:id - This updates the TODO with the matching ID
app.put('/todos/:id', middleware.requireAuthentication, (req, res) => {
  const body = _.pick(req.body, 'completed', 'description'); // Filter results
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
    res.json(user.toPublicJSON()); // Uses instance-based func to filter out passwords etc
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
  // Tells the app to listen to the port for any changes
  app.listen(PORT, () => {
    console.log('Express listening on port ' + PORT + '!');
  });
})
