import con from '../db.js';

export default async function withTransaction(dbFunction) {
  const client = await con.connect();
  try {
    await client.query('BEGIN');

    const result = await dbFunction(client);

    await client.query('COMMIT');

    return result;
  } catch (err) {
    client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
