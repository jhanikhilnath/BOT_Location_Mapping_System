import express from 'express';
import {
  createScanPackage,
  deleteScanPackage,
  getAllScanPackage,
  getScanPackage,
  validateID,
} from '../controller/scanPackageController.js';

const router = express.Router();

router.route('/').get(getAllScanPackage).post(createScanPackage);

router
  .route('/:id')
  .get(validateID, getScanPackage)
  .delete(validateID, deleteScanPackage);

export default router;
