import express from 'express';
import {
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

export default router;
