"""
ORM model: users table.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime
from sqlalchemy.types import Uuid as UUID

from app.database import Base


class User(Base):
    __tablename__ = "users"

    user_id: uuid.UUID = Column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: str = Column(String(255), nullable=False)
    email: str = Column(String(255), nullable=False, unique=True, index=True)
    password_hash: str = Column(String(512), nullable=False)
    role: str = Column(String(50), nullable=False, default="candidate")
    created_at: datetime = Column(DateTime, nullable=False, default=datetime.utcnow)
