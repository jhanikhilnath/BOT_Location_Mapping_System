import con from '../db.js';
import AppError from '../utils/appError.js';

// HELPER

export async function validateID(req, res, next) {
  const id = req.params.id.trim();

  if (!id || !id.startsWith('LOC-') || id.length < 9) {
    return next(
      new AppError('ID parameter is in incorrect format or invalid', 400),
    );
  }

  req.params.id = id;
  next();
}

export async function validateBody(req, res, next) {
  req.body = req.body || {};

  for (const arg in req.body) {
    if (typeof req.body[arg] === 'string' && arg != 'selector') {
      req.body[arg] = req.body[arg].trim().toLowerCase();
    }
    if (arg === 'selector') {
      req.body[arg] = req.body[arg].trim();
    }
  }

  next();
}

// Routes

export async function createLocation(req, res, next) {
  //
  const {
    name,
    website,
    location,
    url,
    selector,
    description,
    status = 'active',
  } = req.body;

  if (!name || !website || !location || !url || !selector) {
    return next(new AppError('Missing Fields', 400));
  }

  // Create Locaiton Entry

  const client = await con.connect();

  try {
    //
    await client.query('BEGIN');
    const locationQuery = `
      INSERT INTO location (name,website, location, url, selector, description, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const locationResult = await client.query(locationQuery, [
      name,
      website,
      location,
      url,
      selector,
      description,
      status,
    ]);
    const newData = locationResult.rows[0];

    const logQuery = `
      INSERT INTO audit_logs (table_name, record_id, action, actor_identity, new_data)
      VALUES  ($1, $2, $3, $4, $5);
    `;
    const logResult = await client.query(logQuery, [
      'location',
      newData.id,
      'CREATE',
      'admin',
      newData,
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      status: 'ok',
      message: 'Location created successfully.',
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

export async function getAllLocation(req, res, next) {
  try {
    const query = `
    SELECT * FROM location;
  `;

    const locationResult = await con.query(query);

    res.status(200).json({
      status: 'ok',
      data: locationResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function getLocation(req, res, next) {
  //
  const id = req.params.id;

  try {
    const query = `
      SELECT * FROM location WHERE id=$1;
    `;
    const locationResult = await con.query(query, [id]);

    if (locationResult.rowCount === 0) {
      throw new AppError('ID Not found', 404);
    }
    res.status(200).json({
      status: 'ok',
      data: locationResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteLocation(req, res, next) {
  const id = req.params.id;

  const client = await con.connect();

  try {
    await client.query('BEGIN');
    const deleteQuery = `
      DELETE FROM location WHERE id=$1 RETURNING *;
    `;
    const locationResult = await client.query(deleteQuery, [id]);

    if (locationResult.rowCount === 0) {
      throw new AppError('ID Not found', 404);
    }
    const data = locationResult.rows[0];

    const logQuery = `
      INSERT INTO audit_logs (table_name, record_id, action, actor_identity, old_data)
      VALUES  ($1, $2, $3, $4, $5);
    `;
    const logResult = await client.query(logQuery, [
      'location',
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

export async function modifyLocation(req, res, next) {
  const updates = req.body;

  const allowedFields = [
    'name',
    'website',
    'location',
    'url',
    'selector',
    'description',
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
    SELECT * FROM location WHERE id=$1;
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
      UPDATE location
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
      'location',
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

export async function getRelatedScanPackage(req, res, next) {
  const checkQuery = `
    SELECT * FROM location WHERE id=$1;
  `;

  const checkResponse = await con.query(checkQuery, [req.params.id]);

  if (checkResponse.rowCount == 0) {
    return next(new AppError('Scan Package not found', 404));
  }

  const query = `
    SELECT s.* FROM mapping m JOIN scan_package s ON s.id=m.scan_package_id WHERE m.location_id=$1;
  `;

  const getResponse = await con.query(query, [req.params.id]);

  res.status(200).json({
    status: 'ok',
    data: getResponse.rows,
  });
}
