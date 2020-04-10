const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('TODO API ROOT');
});

app.listen(PORT, () => {
  console.log('Express listening on PORT: ' + PORT);
})
