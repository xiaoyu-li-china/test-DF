from datetime import date, time, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.booking import Booking, BookingCreate, BookingResponse, SlotResponse


def check_time_overlap(
    existing_start: time, existing_end: time,
    new_start: time, new_end: time
) -> bool:
    existing_start_sec = existing_start.hour * 3600 + existing_start.minute * 60
    existing_end_sec = existing_end.hour * 3600 + existing_end.minute * 60
    new_start_sec = new_start.hour * 3600 + new_start.minute * 60
    new_end_sec = new_end.hour * 3600 + new_end.minute * 60

    return not (new_end_sec <= existing_start_sec or new_start_sec >= existing_end_sec)


def check_booking_conflict(
    db: Session,
    venue_id: int,
    booking_date: date,
    start_time: time,
    end_time: time,
    exclude_booking_id: Optional[int] = None
) -> bool:
    query = db.query(Booking).filter(
        Booking.venue_id == venue_id,
        Booking.booking_date == booking_date
    )

    if exclude_booking_id is not None:
        query = query.filter(Booking.id != exclude_booking_id)

    existing_bookings = query.all()

    for booking in existing_bookings:
        if check_time_overlap(booking.start_time, booking.end_time, start_time, end_time):
            return True

    return False


def create_booking(db: Session, booking_data: BookingCreate) -> Tuple[Optional[Booking], str]:
    if check_booking_conflict(
        db,
        booking_data.venue_id,
        booking_data.booking_date,
        booking_data.start_time,
        booking_data.end_time
    ):
        return None, "该时段已被预订，请选择其他时间"

    db_booking = Booking(
        venue_id=booking_data.venue_id,
        venue_name=booking_data.venue_name,
        booking_date=booking_data.booking_date,
        start_time=booking_data.start_time,
        end_time=booking_data.end_time,
        user_name=booking_data.user_name
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking, "预订成功"


def delete_booking(db: Session, booking_id: int) -> bool:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        return False
    db.delete(booking)
    db.commit()
    return True


def get_bookings(db: Session, filter_date: Optional[date] = None, venue_id: Optional[int] = None) -> List[Booking]:
    query = db.query(Booking)
    if filter_date:
        query = query.filter(Booking.booking_date == filter_date)
    if venue_id is not None:
        query = query.filter(Booking.venue_id == venue_id)
    return query.order_by(Booking.booking_date, Booking.start_time).all()


def get_booking_by_id(db: Session, booking_id: int) -> Optional[Booking]:
    return db.query(Booking).filter(Booking.id == booking_id).first()


def generate_time_slots() -> List[Tuple[time, time]]:
    slots = []
    start_hour = 9
    end_hour = 21
    slot_duration = 60

    current = start_hour * 60
    while current + slot_duration <= end_hour * 60:
        start_min = current
        end_min = current + slot_duration
        start_time = time(hour=start_min // 60, minute=start_min % 60)
        end_time = time(hour=end_min // 60, minute=end_min % 60)
        slots.append((start_time, end_time))
        current += slot_duration

    return slots


VENUES = [
    {"id": 1, "name": "会议室A"},
    {"id": 2, "name": "会议室B"},
    {"id": 3, "name": "培训室"},
]


def get_available_slots(db: Session, filter_date: date) -> List[SlotResponse]:
    slots = generate_time_slots()
    result = []

    for venue in VENUES:
        venue_bookings = db.query(Booking).filter(
            Booking.venue_id == venue["id"],
            Booking.booking_date == filter_date
        ).all()

        for start_time, end_time in slots:
            is_available = True
            for booking in venue_bookings:
                if check_time_overlap(booking.start_time, booking.end_time, start_time, end_time):
                    is_available = False
                    break

            result.append(SlotResponse(
                venue_id=venue["id"],
                venue_name=venue["name"],
                start_time=start_time,
                end_time=end_time,
                is_available=is_available
            ))

    return result
