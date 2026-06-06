import express from 'express';
import {
  createNewMapping,
  validateBody,
} from '../controller/mappingController.js';

const router = express.Router();

router.route('/').post(validateBody, createNewMapping);

export default router;
