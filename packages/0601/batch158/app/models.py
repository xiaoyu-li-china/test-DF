import enum
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Enum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Animal(Base):
    __tablename__ = "animals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    species: Mapped[str] = mapped_column(String(50), nullable=False)
    breed: Mapped[str | None] = mapped_column(String(100), nullable=True)
    age: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    adoptable: Mapped[bool] = mapped_column(default=True, nullable=False)

    applications: Mapped[list["Application"]] = relationship(back_populates="animal")


class HomeVisitStatus(str, enum.Enum):
    NOT_SCHEDULED = "not_scheduled"
    SCHEDULED = "scheduled"
    COMPLETED = "completed"


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    applicant_name: Mapped[str] = mapped_column(String(100), nullable=False)
    applicant_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    applicant_email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    pet_experience: Mapped[str] = mapped_column(Text, nullable=False)
    animal_id: Mapped[int] = mapped_column(Integer, ForeignKey("animals.id"), nullable=False)
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus), default=ApplicationStatus.PENDING, nullable=False
    )
    reviewer_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    home_visit_status: Mapped[HomeVisitStatus] = mapped_column(
        Enum(HomeVisitStatus), default=HomeVisitStatus.NOT_SCHEDULED, nullable=False
    )
    home_visit_scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    home_visit_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    living_photos: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    animal: Mapped["Animal"] = relationship(back_populates="applications")
