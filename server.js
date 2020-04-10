const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const todos =[
  {
    id: 1,
    description: 'Meet mom for lunch',
    completed: false
  },
  {
    id: 2,
    description: 'Go to market',
    completed: false
  },
  {
    id: 3,
    description: 'Water garden',
    completed: false
  }
];

// GET index
app.get('/', (req, res) => {
  res.send('TODO API ROOT');
});

// GET todos
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

app.listen(PORT, () => {
  console.log('Express listening on PORT: ' + PORT);
})
