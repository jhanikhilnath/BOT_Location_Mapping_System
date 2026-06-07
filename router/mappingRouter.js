import express from 'express';
import {
  changeStatus,
  createNewMapping,
  deleteMapping,
  getAllMappings,
  getOneMapping,
  modifyMapping,
  validateBody,
  validateID,
} from '../controller/mappingController.js';

const router = express.Router();

router.route('/').get(getAllMappings).post(validateBody, createNewMapping);

router
  .route('/:id')
  .get(validateID, getOneMapping)
  .delete(validateID, deleteMapping)
  .patch(validateID, validateBody, modifyMapping);

router.route('/:id/status').patch(validateID, validateBody, changeStatus);

export default router;
