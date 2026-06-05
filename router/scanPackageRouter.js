import express from 'express';
import {
  createScanPackage,
  deleteScanPackage,
  getAllScanPackage,
  getScanPackage,
  modifyScanPackage,
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

// TODO
// router.route('/showMappings/:id')

// TODO
// router.route('/toggleActive/:id')

export default router;
