import { ScanPackageRepository } from '../repository/scanPackageRepository.js';
import { logRepository } from '../repository/logRepository.js';
import AppError from '../utils/appError.js';
import withTransaction from '../utils/dbTransaction.js';

export class ScanPackageService {
  static async createScanPackage(packageData) {
    const {
      id,
      name,
      type,
      environment,
      owner,
      status = 'active',
    } = packageData;

    if (!id || !name || !type || !environment || !owner) {
      throw new AppError('Missing Fields', 400);
    }

    return await withTransaction(async client => {
      const newPackage = await ScanPackageRepository.insertScanPackage(
        client,
        id,
        name,
        type,
        environment,
        owner,
        status,
      );

      await logRepository.insertLog(
        client,
        'scan_package',
        newPackage.id,
        'CREATE',
        'admin',
        null,
        newPackage,
      );

      return newPackage;
    });
  }

  static async deleteScanPackage(id) {
    return await withTransaction(async client => {
      const deletedPackage = await ScanPackageRepository.deleteScanPackage(
        client,
        id,
      );

      if (!deletedPackage) {
        throw new AppError('ID Not found', 404);
      }

      await logRepository.insertLog(
        client,
        'scan_package',
        id,
        'DELETE',
        'admin',
        deletedPackage,
        null,
      );

      return deletedPackage;
    });
  }

  static async modifyScanPackage(id, rawUpdates) {
    const allowedFields = ['name', 'type', 'environment', 'owner'];

    const fieldsToUpdate = Object.keys(rawUpdates).filter(
      key => allowedFields.includes(key) && rawUpdates[key] !== undefined,
    );

    if (fieldsToUpdate.length === 0) {
      throw new AppError('No modification values were provided', 400);
    }

    return await withTransaction(async client => {
      const currentData = await ScanPackageRepository.getOneScanPackage(
        id,
        client,
      );

      if (!currentData) {
        throw new AppError('ID Not Found', 404);
      }

      let noDiff = true;
      fieldsToUpdate.forEach(field => {
        if (rawUpdates[field] != currentData[field]) {
          noDiff = false;
        }
      });

      if (noDiff) {
        throw new AppError('Modified Data is same as Current Data', 400);
      }

      const updatedData = await ScanPackageRepository.updateScanPackage(
        client,
        id,
        fieldsToUpdate,
        rawUpdates,
      );

      await logRepository.insertLog(
        client,
        'scan_package',
        id,
        'UPDATE',
        'admin',
        currentData,
        updatedData,
      );

      return updatedData;
    });
  }

  static async changeStatus(id, newStatus) {
    if (!newStatus) {
      throw new AppError('No modification values were provided', 400);
    }

    return await withTransaction(async client => {
      const currentData = await ScanPackageRepository.getOneScanPackage(
        id,
        client,
      );

      if (!currentData) {
        throw new AppError('ID Not Found', 404);
      }

      if (newStatus === currentData.status) {
        throw new AppError('Modified Data is same as Current Data', 400);
      }

      const updatedPackage = await ScanPackageRepository.updateStatus(
        client,
        id,
        newStatus,
      );

      let cascadeMappings = null;

      if (newStatus === 'inactive') {
        cascadeMappings = await ScanPackageRepository.cascadeInactiveStatus(
          client,
          id,
        );
      }

      await logRepository.insertLog(
        client,
        'scan_package',
        id,
        'STATUS',
        'admin',
        currentData,
        updatedPackage,
      );

      return {
        scan_package: updatedPackage,
        mappings: cascadeMappings,
      };
    });
  }
}
