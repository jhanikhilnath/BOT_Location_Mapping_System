import { Client } from 'pg';

console.log('Bot Location Mapping System Started!!!');

const con = new Client({
  host: 'db',
  port: Number(process.env.DB_PORT) || 5432,
  database: 'mydb',
  user: 'postgres',
  password: 'admin',
});

con.connect().then(() => {
  console.log('Hello');
});
