import con from '../db.js';

export class ScanPackageRepository {
  static async insertScanPackage(
    client,
    id,
    name,
    type,
    environment,
    owner,
    status,
  ) {
    const query = `
      INSERT INTO scan_package (id, name, type, environment, owner, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const result = await client.query(query, [
      id,
      name,
      type,
      environment,
      owner,
      status,
    ]);

    return result.rows[0];
  }

  static async getAllScanPackages() {
    const query = `
      SELECT * FROM scan_package;
    `;
    const result = await con.query(query);
    return result.rows;
  }

  static async getOneScanPackage(id, dbClient = con) {
    const query = `
      SELECT * FROM scan_package WHERE id=$1;
    `;
    const result = await dbClient.query(query, [id]);
    return result.rows[0];
  }

  static async deleteScanPackage(client, id) {
    const query = `
      DELETE FROM scan_package WHERE id=$1 RETURNING *;
    `;
    const result = await client.query(query, [id]);
    return result.rows[0];
  }

  static async updateScanPackage(client, id, fieldsToUpdate, updates) {
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
    updateParams.push(id);

    const result = await client.query(updateQuery, updateParams);
    return result.rows[0];
  }

  static async updateStatus(client, id, status) {
    const query = `
      UPDATE scan_package
      SET status=$1
      WHERE id=$2
      RETURNING *;
    `;
    const result = await client.query(query, [status, id]);
    return result.rows[0];
  }

  static async cascadeInactiveStatus(client, scanPackageId) {
    const query = `
      UPDATE scan_package_mapping
      SET status='inactive'
      WHERE scan_package_id=$1 AND status='active'
      RETURNING *;
    `;
    const result = await client.query(query, [scanPackageId]);
    return result.rows;
  }

  static async resolveScanPackage(id) {
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
    const result = await con.query(query, [id]);
    return result.rows;
  }

  static async getRelatedMappings(id) {
    const query = `
      SELECT * FROM scan_package_mapping WHERE scan_package_id=$1;
    `;
    const result = await con.query(query, [id]);
    return result.rows;
  }
}
