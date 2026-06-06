import express from 'express';
import {
  createNewMapping,
  getAllMappings,
  getOneMapping,
  validateBody,
  validateID,
} from '../controller/mappingController.js';

const router = express.Router();

router.route('/').get(getAllMappings).post(validateBody, createNewMapping);

router.route('/:id').get(validateID, getOneMapping);

export default router;
