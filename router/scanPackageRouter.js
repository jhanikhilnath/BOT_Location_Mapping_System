import express from 'express';
import {
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
// TODO
// router.route('/toggleActive/:id')

export default router;
