# BOT Location Mapping System

This system is designed for web-scrapping bots to dynamically fetch web-scrapping tasks

## Exposed Endpoints

### Scan Package

1. **GET `/api/scanPackage`** \
   Fetches all available scan packages
1. **POST `/api/scanPackage`** \
   Creates a new scan package. Accepted body arguments `name`, `type`, `target`, `environment`, `owner`, `status`.
1. **GET `/api/scanPackage/:id`** \
   Gets scan package with the specified id parameter
1. **DELETE `/api/scanPackage/:id`** \
   Deletes scan package with the specified id parameter
1. **PATCH `/api/scanPackage/:id`** \
   Modifies scan package with the specified id parameter. Accepted body arguments `name`, `type`, `target`, `environment`, `owner`.
1. **GET `/api/scanPackage/:id/resolve`** \
   Resolves scan package and returns order based on descending priority 1(highest priority)
1. **GET `/api/scanPackage/:id/mappings`** \
   Gets all mappings related to a scan_package
1. **PATCH `/api/scanPackage/:id/status`** \
   Change status for scan_package and if disabled, then disable all the mappings as well

### Location

1. **GET `/api/location`** \
   Fetches all available locations
1. **POST `/api/location`** \
   Creates a new location. Accepted body arguments `name`, `website`, `location`, `url`, `selector`, `description`, `status`.
1. **GET `/api/location/:id`** \
   Gets location with the specified id parameter
1. **DELETE `/api/location/:id`** \
   Deletes location with the specified id parameter
1. **PATCH `/api/location/:id`** \
   Modifies location with the specified id parameter. Accepted body arguments `name`, `website`, `location`, `url`, `selector`, `description`.
1. **GET `/api/location/:id/scanPackages`** \
   Gets all scan_package related to a location
1. **PATCH `/api/location/:id/status`** \
   Change status for location and if disabled, then disable all the mappings as well

### Mapping

1. **GET `/api/mapping`** \
   Fetches all available mapping
1. **POST `/api/mapping`** \
   Creates a new mapping. Accepted body arguments `scan_package_id`, `location_id`, `action`,`priority`, `frequency`, `notes`, `status`.
1. **GET `/api/mapping/:id`** \
   Gets mapping with the specified id parameter
1. **DELETE `/api/mapping/:id`** \
   Deletes mapping with the specified id parameter
1. **PATCH `/api/mapping/:id`** \
   Modifies mapping with the specified id parameter. Accepted body arguments `scan_package_id`, `location_id`, `action`,`priority`, `frequency`, `notes`.
1. **PATCH `/api/mapping/:id/status`** \
   Change status for mapping

### Logs

1. **GET `/api/logs`** \
   Fetches all logs in order of most recent to last.
