import con from '../db.js';

export class MappingRepository {
  static async insertMapping(
    client,
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
  ) {
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

    return newData;
  }

  static async getAllMappings() {
    const query = `
      SELECT * FROM scan_package_mapping ORDER BY id ASC;
    `;

    const getResponse = await con.query(query);

    return getResponse.rows;
  }

  static async getOneMapping(id) {
    const query = `
      SELECT * FROM scan_package_mapping WHERE id=$1;
    `;

    const getResponse = await con.query(query, [id]);

    return getResponse.rows[0];
  }

  static async deleteOneMapping(client, id) {
    const query = `
      DELETE FROM scan_package_mapping WHERE id=$1 RETURNING *;
    `;
    const deleteResponse = await client.query(query, [id]);

    return deleteResponse.rows[0];
  }

  static async updateMapping(client, id, fieldsToUpdate, updates) {
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
    updateParams.push(id);

    const result = await client.query(updateQuery, updateParams);
    return result.rows[0];
  }

  static async updateStatus(client, id, newStatus) {
    const updateQuery = `
      UPDATE scan_package_mapping
      SET status=$1
      WHERE id=$2
      RETURNING *;
    `;

    const updateResponse = await client.query(updateQuery, [newStatus, id]);

    return updateResponse.rows[0];
  }
}
