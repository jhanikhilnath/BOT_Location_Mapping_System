CREATE TYPE bot_type AS ENUM ('crawler', 'scraper', 'monitor', 'test agent');
CREATE TYPE env_type AS ENUM ('development', 'staging','production');
CREATE TYPE status_type AS ENUM ('active', 'inactive');
CREATE TYPE location_type AS ENUM ('url', 'selector', 'section');
CREATE TYPE mapping_action_type AS ENUM ('visit', 'click', 'extract', 'verify');
CREATE TYPE mapping_status_type AS ENUM ('active', 'inactive', 'draft');


CREATE SEQUENCE sp_id_seq START 1;
CREATE SEQUENCE loc_id_seq START 1;
CREATE SEQUENCE map_id_seq START 1;

CREATE TABLE scan_package (
  id VARCHAR(15) PRIMARY KEY DEFAULT 'SP-' || LPAD(nextval('sp_id_seq')::TEXT, 5, '0'),
  name VARCHAR(300) NOT NULL,
  type bot_type NOT NULL,
  target VARCHAR(300) NOT NULL,
  environment env_type NOT NULL,
  owner VARCHAR(300) NOT NULL,
  status status_type DEFAULT 'active'
);

CREATE TABLE location (
  id VARCHAR(15) PRIMARY KEY DEFAULT 'LOC-' || LPAD(nextval('loc_id_seq')::TEXT, 5, '0'),
  name VARCHAR(300) NOT NULL,
  website VARCHAR(300) NOT NULL,
  location location_type NOT NULL,
  url VARCHAR(500) NOT NULL,
  selector VARCHAR(300) NOT NULL,
  description VARCHAR(500),
  status status_type DEFAULT 'active'
);

CREATE TABLE mapping (
  id VARCHAR(15) PRIMARY KEY DEFAULT 'MAP-' || LPAD(nextval('map_id_seq')::TEXT, 5, '0'),
  scan_package_id VARCHAR(15) NOT NULL REFERENCES scan_package(id),
  location_id VARCHAR(15) NOT NULL REFERENCES location(id),
  priority INTEGER NOT NULL,
  action mapping_action_type NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  status mapping_status_type NOT NULL,
  notes VARCHAR(500),

  UNIQUE (scan_package_id, location_id)
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  record_id VARCHAR(15) NOT NULL,
  action VARCHAR(15) NOT NULL,
  actor_identity VARCHAR(300) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);