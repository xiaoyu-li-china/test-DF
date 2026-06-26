from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.booking import BookingCreate, BookingResponse, SlotResponse
from app.services import booking_service

router = APIRouter(prefix="/api", tags=["bookings"])


@router.get("/slots", response_model=List[SlotResponse])
def get_slots(date: date, db: Session = Depends(get_db)):
    return booking_service.get_available_slots(db, date)


@router.get("/bookings", response_model=List[BookingResponse])
def list_bookings(
    date: Optional[date] = None,
    venue_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return booking_service.get_bookings(db, filter_date=date, venue_id=venue_id)


@router.post("/bookings", response_model=BookingResponse)
def create_booking(booking_data: BookingCreate, db: Session = Depends(get_db)):
    booking, message = booking_service.create_booking(db, booking_data)
    if not booking:
        raise HTTPException(status_code=409, detail=message)
    return booking


@router.delete("/bookings/{booking_id}")
def delete_booking(booking_id: int, db: Session = Depends(get_db)):
    success = booking_service.delete_booking(db, booking_id)
    if not success:
        raise HTTPException(status_code=404, detail="预订不存在")
    return {"message": "取消成功"}
