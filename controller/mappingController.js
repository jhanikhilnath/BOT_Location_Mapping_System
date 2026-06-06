import con from '../db.js';
import AppError from '../utils/appError.js';

// HELPER

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

export async function validateID(req, res, next) {
  const id = req.params.id.trim();

  if (!id || !id.startsWith('MAP-') || id.length < 9) {
    return next(
      new AppError('ID parameter is in incorrect format or invalid', 400),
    );
  }

  req.params.id = id;
  next();
}

// METHODS

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

    const validationQuery = `
      SELECT sp.target, l.website
      FROM scan_package sp, location l
      WHERE sp.id = $1 AND l.id = $2;
    `;
    const validationResult = await client.query(validationQuery, [
      scan_package_id,
      location_id,
    ]);

    if (validationResult.rowCount === 0) {
      throw new AppError('Invalid Scan Package ID or Location ID.', 404);
    }

    const { target, website } = validationResult.rows[0];

    if (target !== website) {
      throw new AppError(
        `The Scan Package targets '${target}', but the Location belongs to '${website}'.`,
        400,
      );
    }

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

export async function getAllMappings(req, res, next) {
  const query = `
    SELECT * FROM mapping;
  `;

  const getResponse = await con.query(query);

  res.status(200).json({
    status: 'ok',
    data: getResponse.rows,
  });
}

export async function getOneMapping(req, res, next) {
  const id = req.params.id;

  const query = `
    SELECT * FROM mapping WHERE id=$1;
  `;

  const getResponse = await con.query(query, [id]);

  if (getResponse.rowCount === 0) {
    return next(new AppError('ID Not found.', 404));
  }

  res.status(200).json({
    status: 'ok',
    data: getResponse.rows[0],
  });
}

export async function deleteMapping(req, res, next) {
  const id = req.params.id;

  const client = await con.connect();

  try {
    await client.query('BEGIN');
    const deleteQuery = `
      DELETE FROM mapping WHERE id=$1 RETURNING *;
    `;
    const deleteResponse = await client.query(deleteQuery, [id]);

    if (deleteResponse.rowCount === 0) {
      throw new AppError('ID Not found', 404);
    }
    const data = deleteResponse.rows[0];

    const logQuery = `
      INSERT INTO audit_logs (table_name, record_id, action, actor_identity, old_data)
      VALUES  ($1, $2, $3, $4, $5);
    `;
    const logResult = await client.query(logQuery, [
      'mapping',
      id,
      'DELETE',
      'admin',
      data,
    ]);

    await client.query('COMMIT');

    res.status(200).json({
      status: 'ok',
      data: data,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

export async function modifyMapping(req, res, next) {
  const updates = req.body;

  const allowedFields = [
    'scan_package_id',
    'location_id',
    'action',
    'priority',
    'frequency',
    'notes',
  ];

  const fieldsToUpdate = Object.keys(updates).filter(
    key => allowedFields.includes(key) && updates[key] !== undefined,
  );

  // console.log(updates);

  if (fieldsToUpdate.length === 0) {
    return next(new AppError('No modification values were provided', 400));
  }

  const client = await con.connect();
  try {
    await client.query('BEGIN');
    const getQuery = `
    SELECT * FROM mapping WHERE id=$1;
  `;

    const getResponse = await client.query(getQuery, [req.params.id]);

    let noDiff = true;

    fieldsToUpdate.forEach(el => {
      if (updates[el] != getResponse.rows[0][el]) {
        noDiff = false;
      }
    });

    if (noDiff) {
      throw new AppError('Modified Data is same as Current Data', 400);
    }

    if (getResponse.rowCount == 0) {
      throw new AppError('ID Not Found', 404);
    }

    const modifications = fieldsToUpdate.map(
      (field, index) => `${field}=$${index + 1}`,
    );

    const updateQuery = `
      UPDATE mapping
      SET ${modifications.join(', ')}
      WHERE id=$${fieldsToUpdate.length + 1}
      RETURNING *;
  `;
    const updateParams = fieldsToUpdate.map((field, index) => updates[field]);

    updateParams.push(req.params.id);

    const updateResponse = await client.query(updateQuery, updateParams);

    if (getResponse.rows[0] == updateResponse.rows[0]) {
      throw new AppError('Data is same', 400);
    }

    const logQuery = `
      INSERT INTO audit_logs (table_name, record_id, action, actor_identity, old_data, new_data)
      VALUES  ($1, $2, $3, $4, $5, $6);
    `;
    const logResult = await client.query(logQuery, [
      'mapping',
      req.params.id,
      'UPDATE',
      'admin',
      getResponse.rows[0],
      updateResponse.rows[0],
    ]);

    await client.query('COMMIT');

    res.status(200).json({
      status: 'ok',
      data: updateResponse.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}
