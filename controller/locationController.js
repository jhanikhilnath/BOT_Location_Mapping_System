import { LocationRepository } from '../repository/locationRepository.js';
import { LocationService } from '../services/locationService.js';
import AppError from '../utils/appError.js';
import catchasync from '../utils/catchasync.js';
import cacheUtil from '../utils/redisClient.js';

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

export async function validateBody(req, res, next) {
  req.body = req.body || {};

  for (const arg in req.body) {
    if (typeof req.body[arg] === 'string') {
      req.body[arg] = req.body[arg].trim().toLowerCase();
    }
  }

  next();
}

export const createLocation = catchasync(async (req, res, next) => {
  const newLocation = await LocationService.createLocation(req.body);

  res.status(201).json({
    status: 'ok',
    data: newLocation,
  });
});

export const getAllLocation = catchasync(async (req, res, next) => {
  const cacheKey = 'location:all';

  const locations = await cacheUtil.getOrSet(cacheKey, async () => {
    return await LocationRepository.getAllLocations();
  });

  res.status(200).json({
    status: 'ok',
    data: locations,
  });
});

export const getLocation = catchasync(async (req, res, next) => {
  const cacheKey = `location:detail:${req.params.id}`;

  const locationData = await cacheUtil.getOrSet(cacheKey, async () => {
    return await LocationRepository.getOneLocation(req.params.id);
  });

  if (!locationData) {
    throw new AppError('ID Not found', 404);
  }

  res.status(200).json({
    status: 'ok',
    data: locationData,
  });
});

export const deleteLocation = catchasync(async (req, res, next) => {
  const deletedLocation = await LocationService.deleteLocation(req.params.id);

  res.status(200).json({
    status: 'ok',
    data: deletedLocation,
  });
});

export const modifyLocation = catchasync(async (req, res, next) => {
  const updatedLocation = await LocationService.modifyLocation(
    req.params.id,
    req.body,
  );

  res.status(200).json({
    status: 'ok',
    data: updatedLocation,
  });
});

export const getRelatedScanPackage = catchasync(async (req, res, next) => {
  const cacheKey = `location:package:${req.params.id}`;

  // 2. Fetch related scan packages
  const scanPackages = await cacheUtil.getOrSet(cacheKey, async () => {
    const locationData = await LocationRepository.getOneLocation(req.params.id);

    if (!locationData) {
      throw new AppError('Location not found', 404);
    }
    return await LocationRepository.getRelatedScanPackages(req.params.id);
  });

  res.status(200).json({
    status: 'ok',
    data: scanPackages,
  });
});

export const changeStatus = catchasync(async (req, res, next) => {
  const statusResult = await LocationService.changeStatus(
    req.params.id,
    req.body.status,
  );

  res.status(200).json({
    status: 'ok',
    data: statusResult,
  });
});

export const resolveLocationPayload = catchasync(async (req, res, next) => {
  const resolvedPayload = await LocationService.resolveLocationPayload(
    req.params.id,
  );

  res.status(200).json({ status: 'ok', resolvedPayload });
});
