import app from './app.js';
import con from './db.js';

console.log('Bot Location Mapping System Started!!!');

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`App running on https://localhost:${port}`);
});
