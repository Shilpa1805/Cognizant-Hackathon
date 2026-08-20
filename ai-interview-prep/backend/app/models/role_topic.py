"""
ORM models: job_roles and topics tables.
"""

import uuid

from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.types import Uuid as UUID
from sqlalchemy.orm import relationship

from app.database import Base


class JobRole(Base):
    __tablename__ = "job_roles"

    role_id: uuid.UUID = Column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    role_name: str = Column(String(255), nullable=False, unique=True)
    description: str = Column(String(1024), nullable=True)

    topics = relationship("Topic", back_populates="job_role")


class Topic(Base):
    __tablename__ = "topics"

    topic_id: uuid.UUID = Column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    role_id: uuid.UUID = Column(
        UUID(as_uuid=True), ForeignKey("job_roles.role_id"), nullable=False, index=True
    )
    topic_name: str = Column(String(255), nullable=False)
    category: str = Column(String(100), nullable=True)

    job_role = relationship("JobRole", back_populates="topics")
