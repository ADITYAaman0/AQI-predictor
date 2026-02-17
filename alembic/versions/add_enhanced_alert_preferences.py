"""Add enhanced alert preferences and push tokens

Revision ID: add_enhanced_alert_prefs
Revises: previous_revision
Create Date: 2026-02-14

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from uuid import uuid4

# revision identifiers, used by Alembic.
revision = 'add_enhanced_alert_prefs'
down_revision = None  # Update this with the actual previous revision
branch_labels = None
depends_on = None


def upgrade():
    # Create user_alert_preferences table
    op.create_table(
        'user_alert_preferences',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('default_channels', postgresql.ARRAY(sa.String()), nullable=False, server_default="{'email'}"),
        sa.Column('quiet_hours_start', sa.Integer(), nullable=True),
        sa.Column('quiet_hours_end', sa.Integer(), nullable=True),
        sa.Column('quiet_hours_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('max_alerts_per_day', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('min_alert_interval_minutes', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('alert_on_good', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('alert_on_moderate', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('alert_on_unhealthy_sensitive', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('alert_on_unhealthy', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('alert_on_very_unhealthy', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('alert_on_hazardous', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('enable_daily_digest', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('daily_digest_time', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), onupdate=sa.text('NOW()'), nullable=False),
    )
    
    # Create indexes for user_alert_preferences
    op.create_index('idx_alert_prefs_user', 'user_alert_preferences', ['user_id'])
    
    # Create push_notification_tokens table
    op.create_table(
        'push_notification_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token', sa.Text(), nullable=False, unique=True),
        sa.Column('device_type', sa.String(50), nullable=False),
        sa.Column('device_name', sa.String(200), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), onupdate=sa.text('NOW()'), nullable=False),
    )
    
    # Create indexes for push_notification_tokens
    op.create_index('idx_push_tokens_user', 'push_notification_tokens', ['user_id'])
    op.create_index('idx_push_tokens_token', 'push_notification_tokens', ['token'])
    op.create_index('idx_push_tokens_active', 'push_notification_tokens', ['is_active'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_push_tokens_active', table_name='push_notification_tokens')
    op.drop_index('idx_push_tokens_token', table_name='push_notification_tokens')
    op.drop_index('idx_push_tokens_user', table_name='push_notification_tokens')
    op.drop_index('idx_alert_prefs_user', table_name='user_alert_preferences')
    
    # Drop tables
    op.drop_table('push_notification_tokens')
    op.drop_table('user_alert_preferences')
