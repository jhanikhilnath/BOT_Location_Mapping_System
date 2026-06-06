import con from '../db.js';
import AppError from '../utils/appError.js';

export async function validateBody(req, res, next) {
  req.body = req.body || {};

  for (const arg in req.body) {
    if (typeof req.body[arg] === 'string' && !arg.endsWith('_id')) {
      req.body[arg] = req.body[arg].trim().toLowerCase();
    }
    if (arg.endsWith('_id')) {
      req.body[arg] = req.body[arg].trim();
    }
  }

  next();
}

export async function createNewMapping(req, res, next) {
  const {
    scan_package_id,
    location_id,
    action,
    priority,
    frequency,
    notes,
    status = 'active',
  } = req.body;

  if (!(scan_package_id || location_id || action || priority || frequency)) {
    return next(new AppError('Missing Required Fields.'));
  }

  const client = await con.connect();

  try {
    await client.query('BEGIN');

    const query = `
      INSERT INTO mapping (scan_package_id, location_id, priority, action, frequency, notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const mappingResult = await client.query(query, [
      scan_package_id,
      location_id,
      priority,
      action,
      frequency,
      notes,
      status,
    ]);

    const newData = mappingResult.rows[0];

    const logQuery = `
      INSERT INTO audit_logs (table_name, record_id, action, actor_identity, new_data)
      VALUES  ($1, $2, $3, $4, $5);
    `;
    const logResult = await client.query(logQuery, [
      'mapping',
      newData.id,
      'CREATE',
      'admin',
      newData,
    ]);

    await client.query('COMMIT');

    res.status(200).json({
      status: 'ok',
      data: newData,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}
