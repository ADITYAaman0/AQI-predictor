"""Add sensor_devices table

Revision ID: add_sensor_devices
Revises: add_enhanced_alert_preferences
Create Date: 2024-02-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from geoalchemy2 import Geometry

# revision identifiers, used by Alembic.
revision = 'add_sensor_devices'
down_revision = 'add_enhanced_alert_preferences'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create sensor_devices table."""
    op.create_table(
        'sensor_devices',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('device_name', sa.String(200), nullable=False),
        sa.Column('device_id', sa.String(100), unique=True, nullable=True),
        sa.Column('location', Geometry('POINT', srid=4326), nullable=True),
        sa.Column('location_name', sa.String(200), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='connected'),
        sa.Column('battery_level', sa.Integer(), nullable=True),
        sa.Column('last_reading_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_reading_aqi', sa.Integer(), nullable=True),
        sa.Column('device_type', sa.String(100), nullable=True),
        sa.Column('firmware_version', sa.String(50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    
    # Create indexes
    op.create_index('idx_devices_user', 'sensor_devices', ['user_id'])
    op.create_index('idx_devices_status', 'sensor_devices', ['status'])
    op.create_index('idx_devices_active', 'sensor_devices', ['is_active'])
    op.create_index('idx_devices_location', 'sensor_devices', ['location'], postgresql_using='gist')


def downgrade() -> None:
    """Drop sensor_devices table."""
    op.drop_index('idx_devices_location', table_name='sensor_devices')
    op.drop_index('idx_devices_active', table_name='sensor_devices')
    op.drop_index('idx_devices_status', table_name='sensor_devices')
    op.drop_index('idx_devices_user', table_name='sensor_devices')
    op.drop_table('sensor_devices')
