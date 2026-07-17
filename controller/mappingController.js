import { MappingRepository } from '../repository/mappingRepository.js';
import { MappingService } from '../services/mappingService.js';
import AppError from '../utils/appError.js';
import catchasync from '../utils/catchasync.js';
import cacheUtil from '../utils/redisClient.js';

export async function validateBody(req, res, next) {
  req.body = req.body || {};

  for (const arg in req.body) {
    if (typeof req.body[arg] === 'string' && !arg.endsWith('_id')) {
      req.body[arg] = req.body[arg].trim().toLowerCase();
    }
    if (typeof req.body[arg] === 'string' && arg.endsWith('_id')) {
      req.body[arg] = req.body[arg].trim();
    }
  }

  next();
}

export async function validateID(req, res, next) {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id) || id <= 0) {
    return next(
      new AppError('ID parameter must be a valid positive integer', 400),
    );
  }

  req.params.id = id;
  next();
}

export const createNewMapping = catchasync(async (req, res, next) => {
  const newMapping = await MappingService.createNewMapping(req.body);
  res.status(200).json({
    status: 'ok',
    data: newMapping,
  });
});

export const getAllMappings = catchasync(async (req, res, next) => {
  const cacheKey = 'mapping:all';

  const mappings = await cacheUtil.getOrSet(cacheKey, async () => {
    return await MappingRepository.getAllMappings();
  });

  res.status(200).json({
    status: 'ok',
    data: mappings,
  });
});

export const getOneMapping = catchasync(async (req, res, next) => {
  const cacheKey = `mapping:detail:${req.params.id}`;

  const getResponse = await cacheUtil.getOrSet(cacheKey, async () => {
    return await MappingRepository.getOneMapping(req.params.id);
  });

  if (!getResponse) {
    return next(new AppError('ID Not found.', 404));
  }

  res.status(200).json({
    status: 'ok',
    data: getResponse,
  });
});

export const deleteMapping = catchasync(async (req, res, next) => {
  const deletedMapping = await MappingService.deleteMapping(req.params.id);

  res.status(200).json({
    status: 'ok',
    data: deletedMapping,
  });
});

export const modifyMapping = catchasync(async (req, res, next) => {
  const updatedMapping = await MappingService.modifyMapping(
    req.params.id,
    req.body,
  );

  res.status(200).json({
    status: 'ok',
    data: updatedMapping,
  });
});

export const changeStatus = catchasync(async (req, res, next) => {
  const updatedResponse = await MappingService.changeStatus(
    req.params.id,
    req.body.status,
  );

  res.status(200).json({
    status: 'ok',
    data: updatedResponse,
  });
});
