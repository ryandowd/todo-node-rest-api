const express = require('express');
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
  const queryParams = req.query;
  let filteredTodos = todos;

  if (queryParams.hasOwnProperty('completed')) {
    const completedBool = queryParams.completed === 'true' ? true : false;
    filteredTodos = _.where(todos, { completed: completedBool });
  } 

  if (queryParams.hasOwnProperty('q') && queryParams.q.length > 0) {
    filteredTodos = _.filter(filteredTodos, todo => {
      const descr = todo.description.toLowerCase();
      const paramDescr = queryParams.q.trim().toLowerCase();
      return descr.indexOf(paramDescr) > -1;
    });
  }

  res.json(filteredTodos);
});

// GET todo/:id
app.get('/todos/:id', (req, res) => {
  // const matchedTodo = todos.filter( todo =>  parseInt(req.params.id) === todo.id);
  const todoId = parseInt(req.params.id);
  const matchedTodo = _.findWhere(todos, {id: todoId});
    
  if (matchedTodo) {
    res.json(matchedTodo);
  } else {
    res.status(404).send('No todo found with that ID');
  }
});

// POST /todos
app.post('/todos', (req, res) => {
  const body = _.pick(req.body, 'completed', 'description');
  const completedIsBool = _.isBoolean(body.completed);
  const hasDescription = _.isString(body.description);
  const blankDescription = body.description.trim().length === 0;
  // let highestId = _.sortBy(todos, 'id')[todos.length - 1].id + 1;

  if (!completedIsBool || !hasDescription || blankDescription) {
    return res.status(400).send();
  }

  // body.id = highestId;
  body.description = body.description.trim();

  // Send to the DB with sequelize
  db.todo.create(body).then(todo => {
    res.json(todo.toJSON());
  }, error => {
    res.status(400).json(error);
  });
});

// DELETE /todos/:id
app.delete('/todos/:id', (req, res) => {
  const todoId = parseInt(req.params.id);
  const matchedTodo = _.findWhere(todos, {id: todoId});
    
  if (matchedTodo) {
    todos = _.without(todos, matchedTodo);
    res.json('Deleted todo with ID: ' + todoId);
  } else {
    res.status(404).json(
      {"Error":'Could not delete todo, because no todo exists with that ID'}
    );
  }
});

// PUT /todos/:id
app.put('/todos/:id', (req, res) => {
  const body = _.pick(req.body, 'completed', 'description');
  const validAttrs = {};
  const hasCompleted = body.hasOwnProperty('completed');
  const completedIsBool = _.isBoolean(body.completed);
  const todoId = parseInt(req.params.id);
  const matchedTodo = _.findWhere(todos, {id: todoId});

  if (!matchedTodo) {
    return res.status(404).json({
      Error: "No matching ID found. You cannot update a TODO that does not exist"
    });
  }
  
  // 'Field: Completed'
  if (hasCompleted && completedIsBool) {
    validAttrs.completed = body.completed;
  } else if (hasCompleted && !completedIsBool) {
    return res.status(400).json({
      Error: "'Completed' field needs to be a boolean"
    });
  }

  const hasDescription = body.hasOwnProperty('description');
  const descriptionIsString = _.isString(body.description);
  const blankDescription = hasDescription && body.description.trim().length === 0;

  // 'Field: Description'
  if (hasDescription && descriptionIsString && !blankDescription) {
    validAttrs.description = body.description.trim();
  } else if (blankDescription) {
    return res.status(400).json({
      Error: "'Description' field cannot be blank"
    });
  }

  _.extend(matchedTodo, validAttrs);
  res.json(matchedTodo);

});

db.sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log('Express listening on port ' + PORT + '!');
  });
})
