import { MappingRepository } from '../repository/mappingRepository.js';
import { logRepository } from '../repository/logRepository.js';
import AppError from '../utils/appError.js';
import withTransaction from '../utils/dbTransaction.js';

export class MappingService {
  static async createNewMapping(mappingData) {
    const {
      scan_package_id,
      location_id,
      locale,
      sp_location_id,
      sp_location_name,
      sp_location_city_code,
      sp_location_country_code,
      sp_additional_fields = {},
      priority,
      status = 'active',
    } = mappingData;

    if (
      !scan_package_id ||
      !location_id ||
      !locale ||
      !sp_location_id ||
      !sp_location_name ||
      !priority
    ) {
      throw new AppError('Missing Required Fields.', 400);
    }

    return await withTransaction(async client => {
      const newMapping = await MappingRepository.insertMapping(
        client,
        scan_package_id,
        location_id,
        locale,
        sp_location_id,
        sp_location_name,
        sp_location_city_code,
        sp_location_country_code,
        sp_additional_fields,
        priority,
        status,
      );

      await logRepository.insertLog(
        client,
        'scan_package_mapping',
        newMapping.id,
        'CREATE',
        'admin',
        null,
        newMapping,
      );

      return newMapping;
    });
  }

  static async deleteMapping(id) {
    return await withTransaction(async client => {
      const deletedMapping = await MappingRepository.deleteOneMapping(
        client,
        id,
      );

      if (!deletedMapping) {
        throw new AppError('ID Not found', 404);
      }

      await logRepository.insertLog(
        client,
        'scan_package_mapping',
        id,
        'DELETE',
        'admin',
        deletedMapping,
        null,
      );

      return deletedMapping;
    });
  }

  static async modifyMapping(id, rawUpdates) {
    const allowedFields = [
      'scan_package_id',
      'location_id',
      'locale',
      'sp_location_id',
      'sp_location_name',
      'sp_location_city_code',
      'sp_location_country_code',
      'sp_additional_fields',
      'priority',
    ];

    const fieldsToUpdate = Object.keys(rawUpdates).filter(
      key => allowedFields.includes(key) && rawUpdates[key] !== undefined,
    );

    if (fieldsToUpdate.length === 0) {
      throw new AppError('No modification values were provided', 400);
    }

    return await withTransaction(async client => {
      const currentData = await MappingRepository.getOneMapping(id, client);

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

      const updatedData = await MappingRepository.updateMapping(
        client,
        id,
        fieldsToUpdate,
        rawUpdates,
      );

      await logRepository.insertLog(
        client,
        'scan_package_mapping',
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
      const getResponse = await MappingRepository.getOneMapping(id, client);

      if (!getResponse) {
        throw new AppError('ID Not Found', 404);
      }

      if (newStatus === getResponse.status) {
        throw new AppError('Modified Data is same as Current Data', 400);
      }

      const updateResponse = await MappingRepository.updateStatus(
        client,
        id,
        newStatus,
      );

      await logRepository.insertLog(
        client,
        'scan_package_mapping',
        id,
        'STATUS',
        'admin',
        getResponse,
        updateResponse,
      );

      return updateResponse;
    });
  }
}
