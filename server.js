const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;
const todos = [];
const _ = require('underscore');
let todoNextId = 1;

app.use(bodyParser.json());

// GET /index
app.get('/', (req, res) => {
  res.send('TODO API ROOT');
});

// GET /todos
app.get('/todos', (req, res) => {
  res.json(todos);
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

  const hasCompleted = _.isBoolean(body.completed);
  const hasDescription = _.isString(body.description);
  const blankDescription = body.description.trim().length === 0;

  if (!hasCompleted || !hasDescription || blankDescription) {
    return res.status(400).send();
  }

  body.id = todoNextId++;
  body.description = body.description.trim();
  todos.push(body);
  res.json(body);
});

app.listen(PORT, () => {
  console.log('Express listening on PORT: ' + PORT);
})
