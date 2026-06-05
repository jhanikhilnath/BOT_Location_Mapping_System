import con from '../db.js';

export default async function getAllLogs(req, res, next) {
  try {
    const query = `
      SELECT * FROM audit_logs ORDER BY created_at DESC;
    `;
    const logResult = await con.query(query);

    res.status(200).json({
      status: 'ok',
      data: logResult.rows,
    });
  } catch (err) {
    next(err);
  }
}
