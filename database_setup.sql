CREATE TYPE bot_type AS ENUM ('crawler', 'scraper', 'monitor', 'test agent');
CREATE TYPE env_type AS ENUM ('development', 'staging', 'production');
CREATE TYPE status_type AS ENUM ('active', 'inactive', 'draft');
CREATE TYPE geo_location_type AS ENUM ('airport', 'train station', 'city', 'hotel', 'point of interest'); 

CREATE TABLE scan_package (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(300) NOT NULL,
    type bot_type NOT NULL,
    environment env_type NOT NULL,
    owner VARCHAR(300) NOT NULL,
    status status_type DEFAULT 'active'
);

CREATE TABLE location (
    id SERIAL PRIMARY KEY,
    name VARCHAR(300) NOT NULL,
    address TEXT,
    type geo_location_type NOT NULL,
    iata VARCHAR(10),
    fn_geo_id VARCHAR(100),
    city VARCHAR(300),
    state VARCHAR(300),
    country VARCHAR(300) NOT NULL,
    region VARCHAR(300),
    latitude NUMERIC(10, 5),
    longitude NUMERIC(10, 5),
    status status_type DEFAULT 'active'
);

CREATE TABLE scan_package_mapping (
    id SERIAL PRIMARY KEY,
    scan_package_id VARCHAR(100) NOT NULL REFERENCES scan_package(id) ON DELETE CASCADE,
    location_id INTEGER NOT NULL REFERENCES location(id) ON DELETE RESTRICT,
    locale VARCHAR(10) NOT NULL,                  
    sp_location_id VARCHAR(100) NOT NULL,
    sp_location_name VARCHAR(300) NOT NULL,
    sp_location_city_code VARCHAR(300),
    sp_location_country_code VARCHAR(10),
    sp_additional_fields JSONB DEFAULT '{}'::jsonb, 
    status status_type DEFAULT 'active',
    UNIQUE (scan_package_id, location_id, locale)
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_identity VARCHAR(300) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);