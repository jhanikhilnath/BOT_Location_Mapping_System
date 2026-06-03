import express from 'express';
import { createScanPackage } from '../controller/scanPackageController.js';

const router = express.Router();

router.route('/').post(createScanPackage);

export default router;
