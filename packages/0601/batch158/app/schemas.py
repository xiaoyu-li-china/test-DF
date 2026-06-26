from datetime import datetime
from pydantic import BaseModel, Field, EmailStr
from app.models import ApplicationStatus, HomeVisitStatus


class ApplicationCreate(BaseModel):
    applicant_name: str = Field(..., min_length=1, max_length=100)
    applicant_phone: str = Field(..., min_length=1, max_length=20)
    applicant_email: str | None = Field(None, max_length=100)
    address: str = Field(..., min_length=1)
    pet_experience: str = Field(..., min_length=1)
    animal_id: int


class ApplicationReview(BaseModel):
    status: ApplicationStatus
    reviewer_note: str | None = None


class HomeVisitSchedule(BaseModel):
    scheduled_at: datetime
    note: str | None = None


class LivingPhotoUpload(BaseModel):
    photo_urls: list[str]


class AnimalBrief(BaseModel):
    id: int
    name: str
    species: str
    breed: str | None = None
    adoptable: bool

    model_config = {"from_attributes": True}


class ApplicationResponse(BaseModel):
    id: int
    applicant_name: str
    applicant_phone: str
    applicant_email: str | None = None
    address: str
    pet_experience: str
    animal_id: int
    animal: AnimalBrief | None = None
    status: ApplicationStatus
    reviewer_note: str | None = None
    home_visit_status: HomeVisitStatus
    home_visit_scheduled_at: datetime | None = None
    home_visit_note: str | None = None
    living_photos: list[str] | None = None
    created_at: datetime
    reviewed_at: datetime | None = None

    model_config = {"from_attributes": True}


class ApplicationProgress(BaseModel):
    id: int
    applicant_name: str
    animal: AnimalBrief | None = None
    status: ApplicationStatus
    reviewer_note: str | None = None
    home_visit_status: HomeVisitStatus
    home_visit_scheduled_at: datetime | None = None
    living_photos: list[str] | None = None
    created_at: datetime
    reviewed_at: datetime | None = None

    model_config = {"from_attributes": True}


class AnimalCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    species: str = Field(..., min_length=1, max_length=50)
    breed: str | None = None
    age: str | None = None
    description: str | None = None


class AnimalResponse(BaseModel):
    id: int
    name: str
    species: str
    breed: str | None = None
    age: str | None = None
    description: str | None = None
    adoptable: bool

    model_config = {"from_attributes": True}


class AvailableTimeSlot(BaseModel):
    date: str
    time_slots: list[str]
