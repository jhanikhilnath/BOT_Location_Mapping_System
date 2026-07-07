import express from 'express';
import { getAllLogs } from '../controller/logsController.js';

const router = express.Router();

router.route('/').get(getAllLogs);

export default router;
