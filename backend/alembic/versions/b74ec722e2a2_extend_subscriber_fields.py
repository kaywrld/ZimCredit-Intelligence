"""extend subscriber fields

Revision ID: b74ec722e2a2
Revises: 56868d7224b4
Create Date: 2026-04-28 21:56:12.770483

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b74ec722e2a2'
down_revision: Union[str, None] = '56868d7224b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make email nullable (we now use contact_email as primary)
    op.alter_column('subscribers', 'email', nullable=True)

    # Extended contact fields
    op.add_column('subscribers', sa.Column('contact_email', sa.String(255), nullable=True))
    op.add_column('subscribers', sa.Column('contact_phone', sa.String(20), nullable=True))
    op.add_column('subscribers', sa.Column('contact_phone2', sa.String(20), nullable=True))
    op.add_column('subscribers', sa.Column('physical_address', sa.Text(), nullable=True))
    op.add_column('subscribers', sa.Column('postal_address', sa.Text(), nullable=True))

    # Primary contact person
    op.add_column('subscribers', sa.Column('contact_person_name', sa.String(255), nullable=True))
    op.add_column('subscribers', sa.Column('contact_person_title', sa.String(255), nullable=True))
    op.add_column('subscribers', sa.Column('contact_person_phone', sa.String(20), nullable=True))
    op.add_column('subscribers', sa.Column('contact_person_email', sa.String(255), nullable=True))

    # Regulatory / licensing
    op.add_column('subscribers', sa.Column('license_number', sa.String(100), nullable=True))
    op.add_column('subscribers', sa.Column('regulator', sa.String(255), nullable=True))
    op.add_column('subscribers', sa.Column('license_expiry', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('subscribers', 'license_expiry')
    op.drop_column('subscribers', 'regulator')
    op.drop_column('subscribers', 'license_number')
    op.drop_column('subscribers', 'contact_person_email')
    op.drop_column('subscribers', 'contact_person_phone')
    op.drop_column('subscribers', 'contact_person_title')
    op.drop_column('subscribers', 'contact_person_name')
    op.drop_column('subscribers', 'postal_address')
    op.drop_column('subscribers', 'physical_address')
    op.drop_column('subscribers', 'contact_phone2')
    op.drop_column('subscribers', 'contact_phone')
    op.drop_column('subscribers', 'contact_email')
    op.alter_column('subscribers', 'email', nullable=False)