import { LocationRepository } from '../repository/locationRepository.js';
import { logRepository } from '../repository/logRepository.js';
import AppError from '../utils/appError.js';
import withTransaction from '../utils/dbTransaction.js';

export class LocationService {
  static async createLocation(locationData) {
    const {
      name,
      address,
      type,
      iata,
      fn_geo_id,
      city,
      state,
      country,
      region,
      latitude,
      longitude,
      status = 'active',
    } = locationData;

    if (!name || !type || !country) {
      throw new AppError('Missing required geographic fields', 400);
    }

    return await withTransaction(async client => {
      const newLocation = await LocationRepository.insertLocation(
        client,
        name,
        address,
        type,
        iata,
        fn_geo_id,
        city,
        state,
        country,
        region,
        latitude,
        longitude,
        status,
      );

      await logRepository.insertLog(
        client,
        'location',
        newLocation.id,
        'CREATE',
        'admin',
        null,
        newLocation,
      );

      return newLocation;
    });
  }

  static async deleteLocation(id) {
    return await withTransaction(async client => {
      const deletedLocation = await LocationRepository.deleteLocation(
        client,
        id,
      );

      if (!deletedLocation) {
        throw new AppError('ID Not found', 404);
      }

      await logRepository.insertLog(
        client,
        'location',
        id,
        'DELETE',
        'admin',
        deletedLocation,
        null,
      );

      return deletedLocation;
    });
  }

  static async modifyLocation(id, rawUpdates) {
    const allowedFields = [
      'name',
      'address',
      'type',
      'iata',
      'fn_geo_id',
      'city',
      'state',
      'country',
      'region',
      'latitude',
      'longitude',
    ];

    const fieldsToUpdate = Object.keys(rawUpdates).filter(
      key => allowedFields.includes(key) && rawUpdates[key] !== undefined,
    );

    if (fieldsToUpdate.length === 0) {
      throw new AppError('No modification values were provided', 400);
    }

    return await withTransaction(async client => {
      const currentData = await LocationRepository.getOneLocation(id, client);

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

      const updatedData = await LocationRepository.updateLocation(
        client,
        id,
        fieldsToUpdate,
        rawUpdates,
      );

      await logRepository.insertLog(
        client,
        'location',
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
      const currentData = await LocationRepository.getOneLocation(id, client);

      if (!currentData) {
        throw new AppError('ID Not Found', 404);
      }

      if (newStatus === currentData.status) {
        throw new AppError('Modified Data is same as Current Data', 400);
      }

      const updatedLocation = await LocationRepository.updateStatus(
        client,
        id,
        newStatus,
      );

      let cascadeMappings = null;

      if (newStatus === 'inactive') {
        cascadeMappings = await LocationRepository.cascadeInactiveStatus(
          client,
          id,
        );
      }

      await logRepository.insertLog(
        client,
        'location',
        id,
        'STATUS',
        'admin',
        currentData,
        updatedLocation,
      );

      return {
        location: updatedLocation,
        mappings: cascadeMappings,
      };
    });
  }

  static async resolveLocationPayload(id) {
    const locationData = await LocationRepository.getActiveLocation(id);

    if (!locationData) {
      throw new AppError('Active Location not found', 404);
    }

    const activeMappings =
      await LocationRepository.getActiveMappingsForLocation(id);

    const scan_package_mappings = {};

    activeMappings.forEach(row => {
      const brand = row.scan_package_id;
      const locale = row.locale;

      if (!scan_package_mappings[brand]) {
        scan_package_mappings[brand] = {};
      }

      scan_package_mappings[brand][locale] = {
        sp_location_id: row.sp_location_id,
        sp_location_name: row.sp_location_name,
        sp_location_city_code: row.sp_location_city_code,
        sp_location_country_code: row.sp_location_country_code,
        sp_location_additional_fields: row.sp_additional_fields || {},
      };
    });

    return {
      location_id: locationData.id,
      location_name: locationData.name,
      location_address: locationData.address,
      location_type: locationData.type,
      iata: locationData.iata,
      fn_geo_id: locationData.fn_geo_id,
      city: locationData.city,
      state: locationData.state,
      country: locationData.country,
      region: locationData.region,
      location_name_variations: [],
      geolocation: [
        Number(locationData.longitude),
        Number(locationData.latitude),
      ],
      scan_package_mappings: scan_package_mappings,
    };
  }
}
