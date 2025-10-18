import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
// @ts-ignore
const port = process.env.PORT || 80;

app.get('/', (_req, res) => {
  res.send('Hello World from TypeScript Express!');
});

app.listen(port, () => {
  console.log(`Express app listening at http://localhost:${port}`);
});