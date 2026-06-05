import express from 'express';

import {
  createLocation,
  deleteLocation,
  getAllLocation,
  getLocation,
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

// TODO
// router.route('/toggleActive/:id')

export default router;
