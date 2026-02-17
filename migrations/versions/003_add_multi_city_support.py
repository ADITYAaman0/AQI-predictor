"""Add multi-city support

Revision ID: 003
Revises: 002
Create Date: 2024-01-26 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
import geoalchemy2

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add multi-city support tables and configurations."""
    
    # Create city_configurations table
    op.create_table('city_configurations',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('city_name', sa.String(100), unique=True, nullable=False),
        sa.Column('city_code', sa.String(20), unique=True, nullable=False),
        sa.Column('state', sa.String(100)),
        sa.Column('country', sa.String(100), server_default='India'),
        sa.Column('center_location', geoalchemy2.Geometry('POINT', srid=4326), nullable=False),
        sa.Column('bounding_box', geoalchemy2.Geometry('POLYGON', srid=4326)),
        sa.Column('population', sa.Integer()),
        sa.Column('area_sq_km', sa.Float()),
        sa.Column('timezone', sa.String(50), server_default='Asia/Kolkata'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('priority', sa.Integer(), server_default='0'),  # Higher priority cities get more resources
        sa.Column('model_config', JSONB),  # City-specific model configurations
        sa.Column('data_sources', JSONB),  # Available data sources for this city
        sa.Column('alert_thresholds', JSONB),  # City-specific alert thresholds
        sa.Column('city_metadata', JSONB),  # Additional city metadata
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'))
    )
    
    # Create city_statistics table for comparative analysis
    op.create_table('city_statistics',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('city_code', sa.String(20), sa.ForeignKey('city_configurations.city_code', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('avg_aqi', sa.Float()),
        sa.Column('max_aqi', sa.Float()),
        sa.Column('min_aqi', sa.Float()),
        sa.Column('avg_pm25', sa.Float()),
        sa.Column('avg_pm10', sa.Float()),
        sa.Column('avg_no2', sa.Float()),
        sa.Column('avg_o3', sa.Float()),
        sa.Column('avg_so2', sa.Float()),
        sa.Column('avg_co', sa.Float()),
        sa.Column('good_hours', sa.Integer()),  # Hours with AQI < 50
        sa.Column('moderate_hours', sa.Integer()),  # Hours with AQI 50-100
        sa.Column('unhealthy_hours', sa.Integer()),  # Hours with AQI > 100
        sa.Column('data_completeness', sa.Float()),  # Percentage of available data
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'))
    )
    
    # Add city_code to monitoring_stations table
    op.add_column('monitoring_stations', 
        sa.Column('city_code', sa.String(20), sa.ForeignKey('city_configurations.city_code', ondelete='SET NULL'))
    )
    
    # Add city_code to predictions table for faster city-based queries
    op.add_column('predictions',
        sa.Column('city_code', sa.String(20))
    )
    
    # Add city_code to source_attributions table
    op.add_column('source_attributions',
        sa.Column('city_code', sa.String(20))
    )
    
    # Create indexes
    op.create_index('idx_city_config_name', 'city_configurations', ['city_name'])
    op.create_index('idx_city_config_code', 'city_configurations', ['city_code'])
    op.create_index('idx_city_config_active', 'city_configurations', ['is_active'])
    op.create_index('idx_city_config_priority', 'city_configurations', ['priority'])
    op.create_index('idx_city_config_location', 'city_configurations', ['center_location'], postgresql_using='gist')
    op.create_index('idx_city_config_bbox', 'city_configurations', ['bounding_box'], postgresql_using='gist')
    
    op.create_index('idx_city_stats_city_date', 'city_statistics', ['city_code', 'date'])
    op.create_index('idx_city_stats_date', 'city_statistics', ['date'])
    
    op.create_index('idx_stations_city_code', 'monitoring_stations', ['city_code'])
    op.create_index('idx_predictions_city_code', 'predictions', ['city_code'])
    op.create_index('idx_attribution_city_code', 'source_attributions', ['city_code'])
    
    # Insert initial city configurations for major Indian cities
    op.execute("""
        INSERT INTO city_configurations (city_name, city_code, state, center_location, priority, is_active) VALUES
        ('Delhi', 'DEL', 'Delhi', ST_GeomFromText('POINT(77.2090 28.6139)', 4326), 10, true),
        ('Mumbai', 'BOM', 'Maharashtra', ST_GeomFromText('POINT(72.8777 19.0760)', 4326), 10, true),
        ('Bangalore', 'BLR', 'Karnataka', ST_GeomFromText('POINT(77.5946 12.9716)', 4326), 9, true),
        ('Hyderabad', 'HYD', 'Telangana', ST_GeomFromText('POINT(78.4867 17.3850)', 4326), 8, true),
        ('Ahmedabad', 'AMD', 'Gujarat', ST_GeomFromText('POINT(72.5714 23.0225)', 4326), 7, true),
        ('Chennai', 'MAA', 'Tamil Nadu', ST_GeomFromText('POINT(80.2707 13.0827)', 4326), 8, true),
        ('Kolkata', 'CCU', 'West Bengal', ST_GeomFromText('POINT(88.3639 22.5726)', 4326), 8, true),
        ('Pune', 'PNQ', 'Maharashtra', ST_GeomFromText('POINT(73.8567 18.5204)', 4326), 7, true),
        ('Jaipur', 'JAI', 'Rajasthan', ST_GeomFromText('POINT(75.7873 26.9124)', 4326), 6, true),
        ('Lucknow', 'LKO', 'Uttar Pradesh', ST_GeomFromText('POINT(80.9462 26.8467)', 4326), 6, true),
        ('Kanpur', 'KNU', 'Uttar Pradesh', ST_GeomFromText('POINT(80.3319 26.4499)', 4326), 5, true),
        ('Nagpur', 'NAG', 'Maharashtra', ST_GeomFromText('POINT(79.0882 21.1458)', 4326), 5, true),
        ('Indore', 'IDR', 'Madhya Pradesh', ST_GeomFromText('POINT(75.8577 22.7196)', 4326), 5, true),
        ('Bhopal', 'BHO', 'Madhya Pradesh', ST_GeomFromText('POINT(77.4126 23.2599)', 4326), 5, true),
        ('Visakhapatnam', 'VTZ', 'Andhra Pradesh', ST_GeomFromText('POINT(83.2185 17.6868)', 4326), 5, true)
    """)


def downgrade() -> None:
    """Remove multi-city support."""
    
    # Drop indexes
    op.drop_index('idx_attribution_city_code', 'source_attributions')
    op.drop_index('idx_predictions_city_code', 'predictions')
    op.drop_index('idx_stations_city_code', 'monitoring_stations')
    
    op.drop_index('idx_city_stats_date', 'city_statistics')
    op.drop_index('idx_city_stats_city_date', 'city_statistics')
    
    op.drop_index('idx_city_config_bbox', 'city_configurations')
    op.drop_index('idx_city_config_location', 'city_configurations')
    op.drop_index('idx_city_config_priority', 'city_configurations')
    op.drop_index('idx_city_config_active', 'city_configurations')
    op.drop_index('idx_city_config_code', 'city_configurations')
    op.drop_index('idx_city_config_name', 'city_configurations')
    
    # Drop columns
    op.drop_column('source_attributions', 'city_code')
    op.drop_column('predictions', 'city_code')
    op.drop_column('monitoring_stations', 'city_code')
    
    # Drop tables
    op.drop_table('city_statistics')
    op.drop_table('city_configurations')
