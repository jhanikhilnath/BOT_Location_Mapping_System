import { ScanPackageRepository } from '../repository/scanPackageRepository.js';
import { ScanPackageService } from '../services/scanPackageService.js';
import AppError from '../utils/appError.js';
import catchasync from '../utils/catchasync.js';

export async function validateID(req, res, next) {
  const id = req.params.id.trim();

  if (!id || id.length < 3) {
    return next(new AppError('ID parameter is invalid', 400));
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

export const createScanPackage = catchasync(async (req, res, next) => {
  const newPackage = await ScanPackageService.createScanPackage(req.body);

  res.status(201).json({
    status: 'ok',
    message: 'Scan Package created successfully.',
    data: newPackage,
  });
});

export const getAllScanPackage = catchasync(async (req, res, next) => {
  const packages = await ScanPackageRepository.getAllScanPackages();

  res.status(200).json({
    status: 'ok',
    data: packages,
  });
});

export const getScanPackage = catchasync(async (req, res, next) => {
  const packageData = await ScanPackageRepository.getOneScanPackage(
    req.params.id,
  );

  if (!packageData) {
    throw new AppError('ID Not found', 404);
  }

  res.status(200).json({
    status: 'ok',
    data: packageData,
  });
});

export const deleteScanPackage = catchasync(async (req, res, next) => {
  const deletedPackage = await ScanPackageService.deleteScanPackage(
    req.params.id,
  );

  res.status(200).json({
    status: 'ok',
    data: deletedPackage,
  });
});

export const modifyScanPackage = catchasync(async (req, res, next) => {
  const updatedPackage = await ScanPackageService.modifyScanPackage(
    req.params.id,
    req.body,
  );

  res.status(200).json({
    status: 'ok',
    data: updatedPackage,
  });
});

export const resolveScanPackage = catchasync(async (req, res, next) => {
  const resolvedData = await ScanPackageRepository.resolveScanPackage(
    req.params.id,
  );

  res.status(200).json({
    status: 'ok',
    data: resolvedData,
  });
});

export const getRelatedMappings = catchasync(async (req, res, next) => {
  const packageData = await ScanPackageRepository.getOneScanPackage(
    req.params.id,
  );
  if (!packageData) {
    throw new AppError('Scan Package not found', 404);
  }

  const mappings = await ScanPackageRepository.getRelatedMappings(
    req.params.id,
  );

  res.status(200).json({
    status: 'ok',
    data: mappings,
  });
});

export const changeStatus = catchasync(async (req, res, next) => {
  const statusResult = await ScanPackageService.changeStatus(
    req.params.id,
    req.body.status,
  );

  res.status(200).json({
    status: 'ok',
    data: statusResult,
  });
});
