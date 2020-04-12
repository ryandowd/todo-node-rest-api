const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;
const todos = [];
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
  const matchedTodo = todos.filter( todo => parseInt(req.params.id) === todo.id);
    
  if (matchedTodo[0]) {
    res.json(matchedTodo[0]);
  } else {
    res.status(404).send('No todo found with that ID');
  }
});

// POST /todos
app.post('/todos', (req, res) => {
  const body = req.body;
  console.log('description: ' + body.description);
  body.id = todoNextId++;
  todos.push(body);
  res.json(body);
});

app.listen(PORT, () => {
  console.log('Express listening on PORT: ' + PORT);
})
