import con from '../db.js';
import AppError from '../utils/appError.js';

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

export async function validateBody(req, res, next) {
  req.body = req.body || {};

  for (const arg in req.body) {
    if (typeof req.body[arg] === 'string') {
      req.body[arg] = req.body[arg].trim().toLowerCase();
    }
  }

  next();
}

export async function createLocation(req, res, next) {
  const {
    name,
    address,
    type,
    iata,
    fn_geo_id,
    city,
    state,
    country,
    region,
    latitude,
    longitude,
    status = 'active',
  } = req.body;

  if (!name || !type || !country) {
    return next(new AppError('Missing required geographic fields', 400));
  }

  const client = await con.connect();

  try {
    await client.query('BEGIN');
    const locationQuery = `
      INSERT INTO location (name, address, type, iata, fn_geo_id, city, state, country, region, latitude, longitude, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    const locationResult = await client.query(locationQuery, [
      name,
      address,
      type,
      iata,
      fn_geo_id,
      city,
      state,
      country,
      region,
      latitude,
      longitude,
      status,
    ]);
    const newData = locationResult.rows[0];

    const logQuery = `
      INSERT INTO audit_logs (table_name, record_id, action, actor_identity, new_data)
      VALUES  ($1, $2, $3, $4, $5);
    `;
    await client.query(logQuery, [
      'location',
      newData.id,
      'CREATE',
      'admin',
      newData,
    ]);

    await client.query('COMMIT');

    res.status(201).json({
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

export async function getAllLocation(req, res, next) {
  try {
    const query = `
      SELECT * FROM location ORDER BY id ASC;
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
    await client.query(logQuery, ['location', id, 'DELETE', 'admin', data]);

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
    'address',
    'type',
    'iata',
    'fn_geo_id',
    'city',
    'state',
    'country',
    'region',
    'latitude',
    'longitude',
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
      SELECT * FROM location WHERE id=$1;
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
      UPDATE location
      SET ${modifications.join(', ')}
      WHERE id=$${fieldsToUpdate.length + 1}
      RETURNING *;
    `;

    const updateParams = fieldsToUpdate.map(field => updates[field]);
    updateParams.push(req.params.id);

    const updateResponse = await client.query(updateQuery, updateParams);

    const logQuery = `
      INSERT INTO audit_logs (table_name, record_id, action, actor_identity, old_data, new_data)
      VALUES  ($1, $2, $3, $4, $5, $6);
    `;
    await client.query(logQuery, [
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
  try {
    const checkQuery = `
      SELECT * FROM location WHERE id=$1;
    `;
    const checkResponse = await con.query(checkQuery, [req.params.id]);

    if (checkResponse.rowCount == 0) {
      return next(new AppError('Location not found', 404));
    }

    const query = `
      SELECT s.* FROM scan_package_mapping m 
      JOIN scan_package s ON s.id = m.scan_package_id 
      WHERE m.location_id=$1;
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
      SELECT * FROM location WHERE id=$1;
    `;
    const getResponse = await client.query(getQuery, [req.params.id]);

    if (getResponse.rowCount == 0) {
      throw new AppError('ID Not Found', 404);
    }

    if (status === getResponse.rows[0].status) {
      throw new AppError('Modified Data is same as Current Data', 400);
    }

    const updateLocQuery = `
      UPDATE location
      SET status=$1
      WHERE id=$2
      RETURNING *;
    `;
    const updateLocResponse = await client.query(updateLocQuery, [
      status,
      req.params.id,
    ]);

    let updateMapResponse = null;

    if (status === 'inactive') {
      const updateMapQuery = `
        UPDATE scan_package_mapping
        SET status='inactive'
        WHERE location_id=$1 AND status='active'
        RETURNING *;
      `;
      updateMapResponse = await client.query(updateMapQuery, [req.params.id]);
    }

    const logQuery = `
      INSERT INTO audit_logs (table_name, record_id, action, actor_identity, old_data, new_data)
      VALUES  ($1, $2, $3, $4, $5, $6);
    `;
    await client.query(logQuery, [
      'location',
      req.params.id,
      'STATUS',
      'admin',
      getResponse.rows[0],
      updateLocResponse.rows[0],
    ]);

    await client.query('COMMIT');

    res.status(200).json({
      status: 'ok',
      data: {
        location: updateLocResponse.rows[0],
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

export async function resolveLocationPayload(req, res, next) {
  const locationId = req.params.id;

  const client = await con.connect();

  try {
    const locQuery = `SELECT * FROM location WHERE id=$1 AND status='active';`;
    const locResult = await client.query(locQuery, [locationId]);

    if (locResult.rowCount === 0) {
      throw new AppError('Active Location not found', 404);
    }

    const locationData = locResult.rows[0];

    const mapQuery = `SELECT * FROM scan_package_mapping WHERE location_id=$1 AND status='active';`;
    const mapResult = await client.query(mapQuery, [locationId]);

    const scan_package_mappings = {};

    mapResult.rows.forEach(row => {
      const brand = row.scan_package_id;
      const locale = row.locale;

      if (!scan_package_mappings[brand]) {
        scan_package_mappings[brand] = {};
      }

      scan_package_mappings[brand][locale] = {
        sp_location_id: row.sp_location_id,
        sp_location_name: row.sp_location_name,
        sp_location_city_code: row.sp_location_city_code,
        sp_location_country_code: row.sp_location_country_code,
        sp_location_additional_fields: row.sp_additional_fields || {},
      };
    });

    res.status(200).json({
      location_id: locationData.id,
      location_name: locationData.name,
      location_address: locationData.address,
      location_type: locationData.type,
      iata: locationData.iata,
      fn_geo_id: locationData.fn_geo_id,
      city: locationData.city,
      state: locationData.state,
      country: locationData.country,
      region: locationData.region,
      location_name_variations: [],
      geolocation: [
        Number(locationData.longitude),
        Number(locationData.latitude),
      ],
      scan_package_mappings: scan_package_mappings,
    });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
}
