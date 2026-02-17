-- Initialize TimescaleDB with PostGIS for AQI Predictor
-- This script runs when the database container starts for the first time

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create database user if not exists (for production)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'aqi_user') THEN
        CREATE ROLE aqi_user WITH LOGIN PASSWORD 'aqi_password';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE aqi_predictor_dev TO aqi_user;
GRANT ALL ON SCHEMA public TO aqi_user;

-- Create air quality measurements hypertable
CREATE TABLE IF NOT EXISTS air_quality_measurements (
    time TIMESTAMPTZ NOT NULL,
    station_id TEXT NOT NULL,
    parameter TEXT NOT NULL,
    value DOUBLE PRECISION,
    unit TEXT,
    quality_flag TEXT DEFAULT 'valid',
    source TEXT,
    location GEOMETRY(POINT, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('air_quality_measurements', 'time', if_not_exists => TRUE);

-- Create indexes for air quality measurements
CREATE INDEX IF NOT EXISTS idx_aq_station_time ON air_quality_measurements (station_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_aq_location ON air_quality_measurements USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_aq_parameter ON air_quality_measurements (parameter);

-- Create weather data hypertable
CREATE TABLE IF NOT EXISTS weather_data (
    time TIMESTAMPTZ NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    wind_speed DOUBLE PRECISION,
    wind_direction DOUBLE PRECISION,
    pressure DOUBLE PRECISION,
    precipitation DOUBLE PRECISION,
    visibility DOUBLE PRECISION,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('weather_data', 'time', if_not_exists => TRUE);

-- Create indexes for weather data
CREATE INDEX IF NOT EXISTS idx_weather_location ON weather_data USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_weather_time ON weather_data (time DESC);

-- Create predictions hypertable
CREATE TABLE IF NOT EXISTS predictions (
    time TIMESTAMPTZ NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    forecast_hour INTEGER NOT NULL,
    parameter TEXT NOT NULL,
    predicted_value DOUBLE PRECISION,
    confidence_lower DOUBLE PRECISION,
    confidence_upper DOUBLE PRECISION,
    model_version TEXT,
    aqi_value INTEGER,
    aqi_category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('predictions', 'time', if_not_exists => TRUE);

-- Create indexes for predictions
CREATE INDEX IF NOT EXISTS idx_predictions_forecast_time ON predictions (forecast_hour, time DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_location ON predictions USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_predictions_parameter ON predictions (parameter);

-- Create monitoring stations table
CREATE TABLE IF NOT EXISTS monitoring_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    elevation DOUBLE PRECISION,
    station_type TEXT,
    parameters TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for monitoring stations
CREATE INDEX IF NOT EXISTS idx_stations_location ON monitoring_stations USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_stations_city ON monitoring_stations (city);
CREATE INDEX IF NOT EXISTS idx_stations_active ON monitoring_stations (is_active);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    full_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users (is_active);

-- Create alert subscriptions table
CREATE TABLE IF NOT EXISTS alert_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    location GEOMETRY(POINT, 4326) NOT NULL,
    location_name TEXT,
    threshold_value INTEGER NOT NULL,
    notification_channels TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for alert subscriptions
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alert_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_location ON alert_subscriptions USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alert_subscriptions (is_active);

-- Set up data retention policies (2 years for measurements, 1 year for predictions)
SELECT add_retention_policy('air_quality_measurements', INTERVAL '2 years', if_not_exists => TRUE);
SELECT add_retention_policy('weather_data', INTERVAL '3 years', if_not_exists => TRUE);
SELECT add_retention_policy('predictions', INTERVAL '1 year', if_not_exists => TRUE);

-- Create continuous aggregates for common queries
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_aqi_summary
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS hour,
    station_id,
    parameter,
    AVG(value) as avg_value,
    MAX(value) as max_value,
    MIN(value) as min_value,
    COUNT(*) as measurement_count
FROM air_quality_measurements
GROUP BY hour, station_id, parameter;

-- Add continuous aggregate policy
SELECT add_continuous_aggregate_policy('hourly_aqi_summary',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE);

-- Insert sample monitoring stations for Delhi
INSERT INTO monitoring_stations (station_id, name, location, city, state, parameters) VALUES
    ('DL001', 'Anand Vihar', ST_GeomFromText('POINT(77.3161 28.6469)', 4326), 'Delhi', 'Delhi', ARRAY['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']),
    ('DL002', 'Punjabi Bagh', ST_GeomFromText('POINT(77.1318 28.6742)', 4326), 'Delhi', 'Delhi', ARRAY['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']),
    ('DL003', 'R K Puram', ST_GeomFromText('POINT(77.1825 28.5636)', 4326), 'Delhi', 'Delhi', ARRAY['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']),
    ('DL004', 'Dwarka', ST_GeomFromText('POINT(77.0469 28.5921)', 4326), 'Delhi', 'Delhi', ARRAY['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'])
ON CONFLICT (station_id) DO NOTHING;

-- Grant permissions on all tables to aqi_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aqi_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aqi_user;

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'TimescaleDB with PostGIS initialization completed successfully';
END
$$;