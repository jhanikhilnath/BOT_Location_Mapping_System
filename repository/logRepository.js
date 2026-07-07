import con from '../db.js';

export class logRepository {
  static async insertLog(
    client,
    table_name,
    record_id,
    action,
    actor_identity,
    old_data,
    new_data,
  ) {
    const query =
      'INSERT INTO audit_logs (table_name, record_id, action, actor_identity, old_data, new_data) VALUES ($1, $2, $3, $4, $5, $6);';

    await client.query(query, [
      table_name,
      record_id,
      action,
      actor_identity,
      old_data,
      new_data,
    ]);
  }

  static async getAllLogs() {
    const logs = await con.query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC;',
    );
    return logs.rows;
  }
}
