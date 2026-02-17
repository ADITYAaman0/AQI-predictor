"""Add data lineage and audit log tables

Revision ID: 002
Revises: 001
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Create data_lineage_records table
    op.create_table(
        'data_lineage_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('event_timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('source', sa.String(200), nullable=False),
        sa.Column('destination', sa.String(200), nullable=True),
        sa.Column('operation', sa.String(100), nullable=True),
        sa.Column('record_count', sa.Integer, nullable=True),
        sa.Column('success', sa.Boolean, default=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('metadata', sa.Text, nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('session_id', sa.String(100), nullable=True),
        sa.Column('parent_event_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['parent_event_id'], ['data_lineage_records.id'], ondelete='SET NULL')
    )
    
    # Create indexes for data_lineage_records
    op.create_index('idx_lineage_event_type', 'data_lineage_records', ['event_type'])
    op.create_index('idx_lineage_timestamp', 'data_lineage_records', ['event_timestamp'])
    op.create_index('idx_lineage_source', 'data_lineage_records', ['source'])
    op.create_index('idx_lineage_session', 'data_lineage_records', ['session_id'])
    op.create_index('idx_lineage_parent', 'data_lineage_records', ['parent_event_id'])
    
    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('user_email', sa.String(255), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('resource_type', sa.String(100), nullable=False),
        sa.Column('resource_id', sa.String(200), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('success', sa.Boolean, default=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('request_data', sa.Text, nullable=True),
        sa.Column('response_data', sa.Text, nullable=True),
        sa.Column('duration_ms', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False)
    )
    
    # Create indexes for audit_logs
    op.create_index('idx_audit_timestamp', 'audit_logs', ['timestamp'])
    op.create_index('idx_audit_user', 'audit_logs', ['user_id'])
    op.create_index('idx_audit_action', 'audit_logs', ['action'])
    op.create_index('idx_audit_resource', 'audit_logs', ['resource_type', 'resource_id'])


def downgrade():
    # Drop audit_logs table and indexes
    op.drop_index('idx_audit_resource', table_name='audit_logs')
    op.drop_index('idx_audit_action', table_name='audit_logs')
    op.drop_index('idx_audit_user', table_name='audit_logs')
    op.drop_index('idx_audit_timestamp', table_name='audit_logs')
    op.drop_table('audit_logs')
    
    # Drop data_lineage_records table and indexes
    op.drop_index('idx_lineage_parent', table_name='data_lineage_records')
    op.drop_index('idx_lineage_session', table_name='data_lineage_records')
    op.drop_index('idx_lineage_source', table_name='data_lineage_records')
    op.drop_index('idx_lineage_timestamp', table_name='data_lineage_records')
    op.drop_index('idx_lineage_event_type', table_name='data_lineage_records')
    op.drop_table('data_lineage_records')
