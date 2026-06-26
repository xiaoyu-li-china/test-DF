from datetime import date, time
from sqlalchemy import Column, Integer, String, Date, Time, UniqueConstraint
from pydantic import BaseModel, Field

from .database import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, index=True)
    venue_name = Column(String)
    booking_date = Column(Date)
    start_time = Column(Time)
    end_time = Column(Time)
    user_name = Column(String)

    __table_args__ = (
        UniqueConstraint("venue_id", "booking_date", "start_time", "end_time", name="uix_venue_date_time"),
    )


class BookingCreate(BaseModel):
    venue_id: int
    venue_name: str
    booking_date: date
    start_time: time
    end_time: time
    user_name: str = Field(min_length=1)


class BookingResponse(BaseModel):
    id: int
    venue_id: int
    venue_name: str
    booking_date: date
    start_time: time
    end_time: time
    user_name: str

    class Config:
        from_attributes = True


class SlotResponse(BaseModel):
    venue_id: int
    venue_name: str
    start_time: time
    end_time: time
    is_available: bool
