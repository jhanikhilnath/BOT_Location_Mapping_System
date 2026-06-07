import express from 'express';

import {
  changeStatus,
  createLocation,
  deleteLocation,
  getAllLocation,
  getLocation,
  getRelatedScanPackage,
  modifyLocation,
  validateBody,
  validateID,
} from '../controller/locationController.js';

const router = express.Router();

router.route('/').get(getAllLocation).post(validateBody, createLocation);

router
  .route('/:id')
  .get(validateID, getLocation)
  .delete(validateID, deleteLocation)
  .patch(validateID, validateBody, modifyLocation);

router.route('/:id/scanPackages').get(validateID, getRelatedScanPackage);

router.route('/:id/status').patch(validateBody, validateID, changeStatus);

export default router;
