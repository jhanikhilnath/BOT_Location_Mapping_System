import con from '../db.js';
import { logRepository } from '../repository/logRepository.js';
import AppError from '../utils/appError.js';

export async function validateID(req, res, next) {
  const id = req.params.id.trim();

  if (!id || id.length < 3) {
    return next(new AppError('ID parameter is invalid', 400));
  }

  req.params.id = id;
  next();
}

export async function validateBody(req, res, next) {
  req.body = req.body || {};

  for (const arg in req.body) {
    if (typeof req.body[arg] === 'string') {
      req.body[arg] = req.body[arg].trim().toLowerCase();
    }
  }

  next();
}

export async function createScanPackage(req, res, next) {
  const { id, name, type, environment, owner, status = 'active' } = req.body;

  if (!id || !name || !type || !environment || !owner) {
    return next(new AppError('Missing Fields', 400));
  }

  const client = await con.connect();

  try {
    await client.query('BEGIN');
    const packageQuery = `
      INSERT INTO scan_package (id, name, type, environment, owner, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const packageResult = await client.query(packageQuery, [
      id,
      name,
      type,
      environment,
      owner,
      status,
    ]);
    const newData = packageResult.rows[0];

    await logRepository.insertLog(
      client,
      'scan_package',
      newData.id,
      'CREATE',
      'admin',
      null,
      newData,
    );

    await client.query('COMMIT');

    res.status(201).json({
      status: 'ok',
      message: 'Scan Package created successfully.',
      data: newData,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

export async function getAllScanPackage(req, res, next) {
  try {
    const query = `
      SELECT * FROM scan_package;
    `;

    const packageResult = await con.query(query);

    res.status(200).json({
      status: 'ok',
      data: packageResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function getScanPackage(req, res, next) {
  const id = req.params.id;

  try {
    const query = `
      SELECT * FROM scan_package WHERE id=$1;
    `;
    const packageResult = await con.query(query, [id]);

    if (packageResult.rowCount === 0) {
      throw new AppError('ID Not found', 404);
    }

    res.status(200).json({
      status: 'ok',
      data: packageResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteScanPackage(req, res, next) {
  const id = req.params.id;
  const client = await con.connect();

  try {
    await client.query('BEGIN');
    const deleteQuery = `
      DELETE FROM scan_package WHERE id=$1 RETURNING *;
    `;
    const packageResult = await client.query(deleteQuery, [id]);

    if (packageResult.rowCount === 0) {
      throw new AppError('ID Not found', 404);
    }
    const data = packageResult.rows[0];

    await logRepository.insertLog(
      client,
      'scan_package',
      id,
      'DELETE',
      'admin',
      data,
      null,
    );

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

export async function modifyScanPackage(req, res, next) {
  const updates = req.body;
  const allowedFields = ['name', 'type', 'environment', 'owner'];

  const fieldsToUpdate = Object.keys(updates).filter(
    key => allowedFields.includes(key) && updates[key] !== undefined,
  );

  if (fieldsToUpdate.length === 0) {
    return next(new AppError('No modification values were provided', 400));
  }

  const client = await con.connect();

  try {
    await client.query('BEGIN');
    const getQuery = `
      SELECT * FROM scan_package WHERE id=$1;
    `;

    const getResponse = await client.query(getQuery, [req.params.id]);

    if (getResponse.rowCount == 0) {
      throw new AppError('ID Not Found', 404);
    }

    let noDiff = true;
    fieldsToUpdate.forEach(el => {
      if (updates[el] != getResponse.rows[0][el]) {
        noDiff = false;
      }
    });

    if (noDiff) {
      throw new AppError('Modified Data is same as Current Data', 400);
    }

    const modifications = fieldsToUpdate.map(
      (field, index) => `${field}=$${index + 1}`,
    );

    const updateQuery = `
      UPDATE scan_package
      SET ${modifications.join(', ')}
      WHERE id=$${fieldsToUpdate.length + 1}
      RETURNING *;
    `;

    const updateParams = fieldsToUpdate.map(field => updates[field]);
    updateParams.push(req.params.id);

    const updateResponse = await client.query(updateQuery, updateParams);

    await logRepository.insertLog(
      client,
      'scan_package',
      req.params.id,
      'UPDATE',
      'admin',
      getResponse.rows[0],
      updateResponse.rows[0],
    );

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

export async function resolveScanPackage(req, res, next) {
  try {
    const query = `
      SELECT 
          m.id AS mapping_id,
          m.priority,
          m.locale,
          m.sp_location_id,
          m.sp_location_name,
          m.sp_additional_fields,
          l.id AS location_id,
          l.name AS location_name,
          l.type AS location_type,
          l.iata,
          l.city,
          l.country,
          l.latitude,
          l.longitude
      FROM scan_package_mapping m 
      JOIN location l ON m.location_id = l.id 
      WHERE m.scan_package_id=$1 
        AND l.status::text='active' 
        AND m.status::text='active'
      ORDER BY m.priority DESC;
    `;

    const resolveResponse = await con.query(query, [req.params.id]);

    res.status(200).json({
      status: 'ok',
      data: resolveResponse.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function getRelatedMappings(req, res, next) {
  try {
    const checkQuery = `
      SELECT * FROM scan_package WHERE id=$1;
    `;
    const checkResponse = await con.query(checkQuery, [req.params.id]);

    if (checkResponse.rowCount == 0) {
      return next(new AppError('Scan Package not found', 404));
    }

    const query = `
      SELECT * FROM scan_package_mapping WHERE scan_package_id=$1;
    `;
    const getResponse = await con.query(query, [req.params.id]);

    res.status(200).json({
      status: 'ok',
      data: getResponse.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function changeStatus(req, res, next) {
  const { status } = req.body;

  if (!status) {
    return next(new AppError('No modification values were provided', 400));
  }

  const client = await con.connect();

  try {
    await client.query('BEGIN');
    const getQuery = `
      SELECT * FROM scan_package WHERE id=$1;
    `;
    const getResponse = await client.query(getQuery, [req.params.id]);

    if (getResponse.rowCount == 0) {
      throw new AppError('ID Not Found', 404);
    }

    if (status === getResponse.rows[0].status) {
      throw new AppError('Modified Data is same as Current Data', 400);
    }

    const updateSpQuery = `
      UPDATE scan_package
      SET status=$1
      WHERE id=$2
      RETURNING *;
    `;
    const updateSpResponse = await client.query(updateSpQuery, [
      status,
      req.params.id,
    ]);

    let updateMapResponse = null;

    if (status === 'inactive') {
      const updateMapQuery = `
        UPDATE scan_package_mapping
        SET status='inactive'
        WHERE scan_package_id=$1 AND status='active'
        RETURNING *;
      `;
      updateMapResponse = await client.query(updateMapQuery, [req.params.id]);
    }
    await logRepository.insertLog(
      client,
      'scan_package',
      req.params.id,
      'STATUS',
      'admin',
      getResponse.rows[0],
      updateSpResponse.rows[0],
    );

    await client.query('COMMIT');

    res.status(200).json({
      status: 'ok',
      data: {
        scan_package: updateSpResponse.rows[0],
        mappings: updateMapResponse ? updateMapResponse.rows : null,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}
