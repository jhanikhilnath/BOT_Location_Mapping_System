import con from '../db.js';

export class LocationRepository {
  static async insertLocation(
    client,
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
  ) {
    const query = `
      INSERT INTO location (name, address, type, iata, fn_geo_id, city, state, country, region, latitude, longitude, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    const result = await client.query(query, [
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
    return result.rows[0];
  }

  static async getAllLocations() {
    const query = `SELECT * FROM location ORDER BY id ASC;`;
    const result = await con.query(query);
    return result.rows;
  }

  static async getOneLocation(id, dbClient = con) {
    const query = `SELECT * FROM location WHERE id=$1;`;
    const result = await dbClient.query(query, [id]);
    return result.rows[0];
  }

  static async deleteLocation(client, id) {
    const query = `DELETE FROM location WHERE id=$1 RETURNING *;`;
    const result = await client.query(query, [id]);
    return result.rows[0];
  }

  static async updateLocation(client, id, fieldsToUpdate, updates) {
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
    updateParams.push(id);

    const result = await client.query(updateQuery, updateParams);
    return result.rows[0];
  }

  static async getRelatedScanPackages(id) {
    const query = `
      SELECT s.* FROM scan_package_mapping m 
      JOIN scan_package s ON s.id = m.scan_package_id 
      WHERE m.location_id=$1;
    `;
    const result = await con.query(query, [id]);
    return result.rows;
  }

  static async updateStatus(client, id, status) {
    const query = `
      UPDATE location
      SET status=$1
      WHERE id=$2
      RETURNING *;
    `;
    const result = await client.query(query, [status, id]);
    return result.rows[0];
  }

  static async cascadeInactiveStatus(client, locationId) {
    const query = `
      UPDATE scan_package_mapping
      SET status='inactive'
      WHERE location_id=$1 AND status='active'
      RETURNING *;
    `;
    const result = await client.query(query, [locationId]);
    return result.rows;
  }

  static async getActiveLocation(id, dbClient = con) {
    const query = `SELECT * FROM location WHERE id=$1 AND status='active';`;
    const result = await dbClient.query(query, [id]);
    return result.rows[0];
  }

  static async getActiveMappingsForLocation(id, dbClient = con) {
    const query = `SELECT * FROM scan_package_mapping WHERE location_id=$1 AND status='active';`;
    const result = await dbClient.query(query, [id]);
    return result.rows;
  }
}
