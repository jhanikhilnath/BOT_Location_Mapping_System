import con from '../db.js';
import AppError from '../utils/appError.js';

export async function createScanPackage(req, res, next) {
  req.body = req.body || {};

  for (const arg in req.body) {
    if (typeof req.body[arg] === 'string') {
      req.body[arg] = req.body[arg].trim().toLowerCase();
    }
  }
  //
  const {
    name,
    type,
    target,
    environment,
    owner,
    status = 'active',
  } = req.body;

  if (!name || !type || !target || !environment || !owner) {
    return next(new AppError('Missing Fields', 400));
  }

  // Create Scan Package Entry

  const client = await con.connect();

  try {
    //
    await client.query('BEGIN');
    const packageQuery = `
      INSERT INTO scan_package (name, type, target, environment, owner, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const packageResult = await client.query(packageQuery, [
      name,
      type,
      target,
      environment,
      owner,
      status,
    ]);
    const newData = packageResult.rows[0];

    const logQuery = `
      INSERT INTO audit_logs (table_name, record_id, action, actor_identity, new_data)
      VALUES  ($1, $2, $3, $4, $5);
    `;
    const logResult = await client.query(logQuery, [
      'scan_package',
      newData.id,
      'CREATE',
      'admin',
      newData,
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      status: 'ok',
      message: 'Scan Package created successfully.',
      data: newData,
    });
  } catch (err) {
    //
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}
