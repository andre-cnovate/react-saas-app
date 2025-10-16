import express from 'express';

const app = express();
const port = 3000;

app.get('/', (_req, res) => {
  res.send('Hello World from TypeScript Express!');
});

app.listen(port, () => {
  console.log(`Express app listening at http://localhost:${port}`);
});