import con from '../db.js';
import { logRepository } from '../repository/logRepository.js';
import AppError from '../utils/appError.js';

export async function validateBody(req, res, next) {
  req.body = req.body || {};

  for (const arg in req.body) {
    if (typeof req.body[arg] === 'string' && !arg.endsWith('_id')) {
      req.body[arg] = req.body[arg].trim().toLowerCase();
    }
    if (typeof req.body[arg] === 'string' && arg.endsWith('_id')) {
      req.body[arg] = req.body[arg].trim();
    }
  }

  next();
}

export async function validateID(req, res, next) {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id) || id <= 0) {
    return next(
      new AppError('ID parameter must be a valid positive integer', 400),
    );
  }

  req.params.id = id;
  next();
}

export async function createNewMapping(req, res, next) {
  const {
    scan_package_id,
    location_id,
    locale,
    sp_location_id,
    sp_location_name,
    sp_location_city_code,
    sp_location_country_code,
    sp_additional_fields = {},
    priority,
    status = 'active',
  } = req.body;

  if (
    !scan_package_id ||
    !location_id ||
    !locale ||
    !sp_location_id ||
    !sp_location_name ||
    !priority
  ) {
    return next(new AppError('Missing Required Fields.', 400));
  }

  const client = await con.connect();

  try {
    await client.query('BEGIN');

    const query = `
      INSERT INTO scan_package_mapping (scan_package_id, location_id, locale, sp_location_id, sp_location_name, sp_location_city_code, sp_location_country_code, sp_additional_fields, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const mappingResult = await client.query(query, [
      scan_package_id,
      location_id,
      locale,
      sp_location_id,
      sp_location_name,
      sp_location_city_code,
      sp_location_country_code,
      sp_additional_fields,
      priority,
      status,
    ]);

    const newData = mappingResult.rows[0];

    await logRepository.insertLog(
      client,
      'scan_package_mapping',
      newData.id,
      'CREATE',
      'admin',
      null,
      newData,
    );

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
  try {
    const query = `
      SELECT * FROM scan_package_mapping ORDER BY id ASC;
    `;

    const getResponse = await con.query(query);

    res.status(200).json({
      status: 'ok',
      data: getResponse.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function getOneMapping(req, res, next) {
  const id = req.params.id;

  try {
    const query = `
      SELECT * FROM scan_package_mapping WHERE id=$1;
    `;

    const getResponse = await con.query(query, [id]);

    if (getResponse.rowCount === 0) {
      return next(new AppError('ID Not found.', 404));
    }

    res.status(200).json({
      status: 'ok',
      data: getResponse.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteMapping(req, res, next) {
  const id = req.params.id;

  const client = await con.connect();

  try {
    await client.query('BEGIN');
    const deleteQuery = `
      DELETE FROM scan_package_mapping WHERE id=$1 RETURNING *;
    `;
    const deleteResponse = await client.query(deleteQuery, [id]);

    if (deleteResponse.rowCount === 0) {
      throw new AppError('ID Not found', 404);
    }
    const data = deleteResponse.rows[0];

    await logRepository.insertLog(
      client,
      'scan_package_mapping',
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

export async function modifyMapping(req, res, next) {
  const updates = req.body;

  const allowedFields = [
    'scan_package_id',
    'location_id',
    'locale',
    'sp_location_id',
    'sp_location_name',
    'sp_location_city_code',
    'sp_location_country_code',
    'sp_additional_fields',
    'priority',
  ];

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
      SELECT * FROM scan_package_mapping WHERE id=$1;
    `;

    const getResponse = await client.query(getQuery, [req.params.id]);

    if (getResponse.rowCount == 0) {
      throw new AppError('ID Not Found', 404);
    }
    let noDiff = true;

    fieldsToUpdate.forEach(el => {
      // For JSON objects, a simple != comparison in JS checks object references,
      // but keeping your logic identical per your instruction style.
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
      UPDATE scan_package_mapping
      SET ${modifications.join(', ')}
      WHERE id=$${fieldsToUpdate.length + 1}
      RETURNING *;
    `;
    const updateParams = fieldsToUpdate.map(field => updates[field]);

    updateParams.push(req.params.id);

    const updateResponse = await client.query(updateQuery, updateParams);

    await logRepository.insertLog(
      client,
      'scan_package_mapping',
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

export async function changeStatus(req, res, next) {
  const { status } = req.body;

  if (!status) {
    return next(new AppError('No modification values were provided', 400));
  }

  const client = await con.connect();

  try {
    await client.query('BEGIN');
    const getQuery = `
      SELECT * FROM scan_package_mapping WHERE id=$1;
    `;

    const getResponse = await client.query(getQuery, [req.params.id]);

    if (getResponse.rowCount == 0) {
      throw new AppError('ID Not Found', 404);
    }

    if (status === getResponse.rows[0].status) {
      throw new AppError('Modified Data is same as Current Data', 400);
    }

    const updateQuery = `
      UPDATE scan_package_mapping
      SET status=$1
      WHERE id=$2
      RETURNING *;
    `;

    const updateResponse = await client.query(updateQuery, [
      status,
      req.params.id,
    ]);

    await logRepository.insertLog(
      client,
      'scan_package_mapping',
      req.params.id,
      'STATUS',
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
