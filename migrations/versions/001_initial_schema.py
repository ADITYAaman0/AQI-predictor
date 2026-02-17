"""Initial database schema

Revision ID: 001
Revises: 
Create Date: 2024-01-25 18:55:00.000000

"""
from alembic import op
import sqlalchemy as sa
import geoalchemy2

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create initial database schema with TimescaleDB hypertables."""
    
    # Enable extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb;")
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    
    # Create monitoring_stations table
    op.create_table('monitoring_stations',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('station_id', sa.String(50), unique=True, nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('location', geoalchemy2.Geometry('POINT', srid=4326), nullable=False),
        sa.Column('city', sa.String(100)),
        sa.Column('state', sa.String(100)),
        sa.Column('country', sa.String(100), server_default='India'),
        sa.Column('elevation', sa.Float()),
        sa.Column('station_type', sa.String(50)),
        sa.Column('parameters', sa.ARRAY(sa.String)),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'))
    )
    
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('password_hash', sa.Text()),
        sa.Column('full_name', sa.String(200)),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('is_verified', sa.Boolean(), server_default='false'),
        sa.Column('role', sa.String(50), server_default='user'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'))
    )
    
    # Create alert_subscriptions table
    op.create_table('alert_subscriptions',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('location', geoalchemy2.Geometry('POINT', srid=4326), nullable=False),
        sa.Column('location_name', sa.String(200)),
        sa.Column('threshold_value', sa.Integer(), nullable=False),
        sa.Column('notification_channels', sa.ARRAY(sa.String), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'))
    )
    
    # Create air_quality_measurements table (will be converted to hypertable)
    op.create_table('air_quality_measurements',
        sa.Column('time', sa.DateTime(timezone=True), primary_key=True, nullable=False),
        sa.Column('station_id', sa.String(50), primary_key=True, nullable=False),
        sa.Column('parameter', sa.String(20), primary_key=True, nullable=False),
        sa.Column('value', sa.Float()),
        sa.Column('unit', sa.String(20)),
        sa.Column('quality_flag', sa.String(20), server_default='valid'),
        sa.Column('source', sa.String(100)),
        sa.Column('location', geoalchemy2.Geometry('POINT', srid=4326)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'))
    )
    
    # Create weather_data table (will be converted to hypertable)
    op.create_table('weather_data',
        sa.Column('time', sa.DateTime(timezone=True), primary_key=True, nullable=False),
        sa.Column('location', geoalchemy2.Geometry('POINT', srid=4326), primary_key=True, nullable=False),
        sa.Column('temperature', sa.Float()),
        sa.Column('humidity', sa.Float()),
        sa.Column('wind_speed', sa.Float()),
        sa.Column('wind_direction', sa.Float()),
        sa.Column('pressure', sa.Float()),
        sa.Column('precipitation', sa.Float()),
        sa.Column('visibility', sa.Float()),
        sa.Column('source', sa.String(100)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'))
    )
    
    # Create predictions table (will be converted to hypertable)
    op.create_table('predictions',
        sa.Column('time', sa.DateTime(timezone=True), primary_key=True, nullable=False),
        sa.Column('location', geoalchemy2.Geometry('POINT', srid=4326), primary_key=True, nullable=False),
        sa.Column('forecast_hour', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('parameter', sa.String(20), primary_key=True, nullable=False),
        sa.Column('predicted_value', sa.Float()),
        sa.Column('confidence_lower', sa.Float()),
        sa.Column('confidence_upper', sa.Float()),
        sa.Column('model_version', sa.String(50)),
        sa.Column('aqi_value', sa.Integer()),
        sa.Column('aqi_category', sa.String(50)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'))
    )
    
    # Create source_attributions table
    op.create_table('source_attributions',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('location', geoalchemy2.Geometry('POINT', srid=4326), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('vehicular_percent', sa.Float()),
        sa.Column('industrial_percent', sa.Float()),
        sa.Column('biomass_percent', sa.Float()),
        sa.Column('background_percent', sa.Float()),
        sa.Column('confidence_score', sa.Float()),
        sa.Column('model_version', sa.String(50)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'))
    )
    
    # Create data_quality_flags table
    op.create_table('data_quality_flags',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('measurement_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('station_id', sa.String(50), nullable=False),
        sa.Column('parameter', sa.String(20), nullable=False),
        sa.Column('flag_type', sa.String(50), nullable=False),
        sa.Column('flag_reason', sa.Text()),
        sa.Column('original_value', sa.Float()),
        sa.Column('corrected_value', sa.Float()),
        sa.Column('confidence', sa.Float()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'))
    )
    
    # Create model_metadata table
    op.create_table('model_metadata',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('model_version', sa.String(50), nullable=False),
        sa.Column('model_type', sa.String(50), nullable=False),
        sa.Column('parameters', sa.Text()),
        sa.Column('training_data_start', sa.DateTime(timezone=True)),
        sa.Column('training_data_end', sa.DateTime(timezone=True)),
        sa.Column('validation_rmse', sa.Float()),
        sa.Column('validation_mae', sa.Float()),
        sa.Column('is_active', sa.Boolean(), server_default='false'),
        sa.Column('file_path', sa.String(500)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'))
    )
    
    # Convert tables to hypertables
    op.execute("SELECT create_hypertable('air_quality_measurements', 'time', if_not_exists => TRUE);")
    op.execute("SELECT create_hypertable('weather_data', 'time', if_not_exists => TRUE);")
    op.execute("SELECT create_hypertable('predictions', 'time', if_not_exists => TRUE);")
    
    # Create indexes
    op.create_index('idx_stations_location', 'monitoring_stations', ['location'], postgresql_using='gist')
    op.create_index('idx_stations_city', 'monitoring_stations', ['city'])
    op.create_index('idx_stations_active', 'monitoring_stations', ['is_active'])
    
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_active', 'users', ['is_active'])
    
    op.create_index('idx_alerts_user', 'alert_subscriptions', ['user_id'])
    op.create_index('idx_alerts_location', 'alert_subscriptions', ['location'], postgresql_using='gist')
    op.create_index('idx_alerts_active', 'alert_subscriptions', ['is_active'])
    
    op.create_index('idx_aq_station_time', 'air_quality_measurements', ['station_id', 'time'])
    op.create_index('idx_aq_location', 'air_quality_measurements', ['location'], postgresql_using='gist')
    op.create_index('idx_aq_parameter', 'air_quality_measurements', ['parameter'])
    
    op.create_index('idx_weather_location', 'weather_data', ['location'], postgresql_using='gist')
    op.create_index('idx_weather_time', 'weather_data', ['time'])
    
    op.create_index('idx_predictions_forecast_time', 'predictions', ['forecast_hour', 'time'])
    op.create_index('idx_predictions_location', 'predictions', ['location'], postgresql_using='gist')
    op.create_index('idx_predictions_parameter', 'predictions', ['parameter'])
    
    op.create_index('idx_attribution_location', 'source_attributions', ['location'], postgresql_using='gist')
    op.create_index('idx_attribution_timestamp', 'source_attributions', ['timestamp'])
    
    op.create_index('idx_quality_station_time', 'data_quality_flags', ['station_id', 'measurement_time'])
    op.create_index('idx_quality_flag_type', 'data_quality_flags', ['flag_type'])
    
    op.create_index('idx_model_name_version', 'model_metadata', ['model_name', 'model_version'])
    op.create_index('idx_model_active', 'model_metadata', ['is_active'])
    
    # Set up data retention policies
    op.execute("SELECT add_retention_policy('air_quality_measurements', INTERVAL '2 years', if_not_exists => TRUE);")
    op.execute("SELECT add_retention_policy('weather_data', INTERVAL '3 years', if_not_exists => TRUE);")
    op.execute("SELECT add_retention_policy('predictions', INTERVAL '1 year', if_not_exists => TRUE);")
    
    # Create continuous aggregates
    op.execute("""
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
    """)
    
    # Add continuous aggregate policy
    op.execute("""
        SELECT add_continuous_aggregate_policy('hourly_aqi_summary',
            start_offset => INTERVAL '1 day',
            end_offset => INTERVAL '1 hour',
            schedule_interval => INTERVAL '1 hour',
            if_not_exists => TRUE);
    """)


def downgrade() -> None:
    """Drop all tables and extensions."""
    
    # Drop continuous aggregates
    op.execute("DROP MATERIALIZED VIEW IF EXISTS hourly_aqi_summary;")
    
    # Drop tables
    op.drop_table('model_metadata')
    op.drop_table('data_quality_flags')
    op.drop_table('source_attributions')
    op.drop_table('predictions')
    op.drop_table('weather_data')
    op.drop_table('air_quality_measurements')
    op.drop_table('alert_subscriptions')
    op.drop_table('users')
    op.drop_table('monitoring_stations')
    
    # Note: Extensions are not dropped to avoid affecting other databases