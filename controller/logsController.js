import { logRepository } from '../repository/logRepository.js';
import catchasync from '../utils/catchasync.js';

export const getAllLogs = catchasync(async (req, res, next) => {
  const logResult = await logRepository.getAllLogs();

  res.status(200).json({
    status: 'ok',
    data: logResult,
  });
});
