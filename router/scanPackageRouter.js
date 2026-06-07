import express from 'express';
import {
  changeStatus,
  createScanPackage,
  deleteScanPackage,
  getAllScanPackage,
  getRelatedMappings,
  getScanPackage,
  modifyScanPackage,
  resolveScanPackage,
  validateBody,
  validateID,
} from '../controller/scanPackageController.js';

const router = express.Router();

router.route('/').get(getAllScanPackage).post(validateBody, createScanPackage);

router
  .route('/:id')
  .get(validateID, getScanPackage)
  .delete(validateID, deleteScanPackage)
  .patch(validateBody, validateID, modifyScanPackage);

router.route('/:id/resolve').get(validateID, resolveScanPackage);

router.route('/:id/mappings').get(validateID, getRelatedMappings);

router.route('/:id/status').patch(validateBody, validateID, changeStatus);

export default router;
