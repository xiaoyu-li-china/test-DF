from datetime import date, time

from fastapi.testclient import TestClient

TEST_DATE = "2026-06-15"


def test_create_booking_success(client: TestClient):
    response = client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "user_name": "张三"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert data["venue_id"] == 1
    assert data["user_name"] == "张三"


def test_create_booking_conflict_same_time(client: TestClient):
    client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "user_name": "张三"
        }
    )

    response = client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "user_name": "李四"
        }
    )
    assert response.status_code == 409
    assert "已被预订" in response.json()["detail"]


def test_create_booking_conflict_overlap_start(client: TestClient):
    client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "user_name": "张三"
        }
    )

    response = client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "09:30:00",
            "end_time": "10:30:00",
            "user_name": "李四"
        }
    )
    assert response.status_code == 409


def test_create_booking_conflict_overlap_end(client: TestClient):
    client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "user_name": "张三"
        }
    )

    response = client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "10:30:00",
            "end_time": "11:30:00",
            "user_name": "李四"
        }
    )
    assert response.status_code == 409


def test_create_booking_conflict_fully_enclosed(client: TestClient):
    client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "10:00:00",
            "end_time": "12:00:00",
            "user_name": "张三"
        }
    )

    response = client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "10:30:00",
            "end_time": "11:30:00",
            "user_name": "李四"
        }
    )
    assert response.status_code == 409


def test_create_booking_no_conflict_different_venue(client: TestClient):
    client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "user_name": "张三"
        }
    )

    response = client.post(
        "/api/bookings",
        json={
            "venue_id": 2,
            "venue_name": "会议室B",
            "booking_date": TEST_DATE,
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "user_name": "李四"
        }
    )
    assert response.status_code == 200


def test_create_booking_no_conflict_different_date(client: TestClient):
    client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "user_name": "张三"
        }
    )

    response = client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": "2026-06-16",
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "user_name": "李四"
        }
    )
    assert response.status_code == 200


def test_create_booking_no_conflict_adjacent_time(client: TestClient):
    client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "user_name": "张三"
        }
    )

    response = client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "11:00:00",
            "end_time": "12:00:00",
            "user_name": "李四"
        }
    )
    assert response.status_code == 200


def test_delete_booking_success(client: TestClient):
    create_response = client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "user_name": "张三"
        }
    )
    booking_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/bookings/{booking_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["message"] == "取消成功"

    bookings_response = client.get("/api/bookings")
    assert len(bookings_response.json()) == 0


def test_delete_booking_not_found(client: TestClient):
    response = client.delete("/api/bookings/999")
    assert response.status_code == 404


def test_book_after_cancel_same_slot(client: TestClient):
    create_response = client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "user_name": "张三"
        }
    )
    booking_id = create_response.json()["id"]

    client.delete(f"/api/bookings/{booking_id}")

    response = client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "user_name": "李四"
        }
    )
    assert response.status_code == 200


def test_get_slots_available(client: TestClient):
    response = client.get(f"/api/slots?date={TEST_DATE}")
    assert response.status_code == 200
    slots = response.json()
    assert len(slots) > 0
    assert all(slot["is_available"] for slot in slots)


def test_get_slots_booking_makes_unavailable(client: TestClient):
    client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "user_name": "张三"
        }
    )

    response = client.get(f"/api/slots?date={TEST_DATE}")
    slots = response.json()

    booked_slot = next(
        (s for s in slots if s["venue_id"] == 1 and s["start_time"] == "10:00:00"),
        None
    )
    assert booked_slot is not None
    assert booked_slot["is_available"] is False


def test_list_bookings_filter_by_date(client: TestClient):
    client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": TEST_DATE,
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "user_name": "张三"
        }
    )
    client.post(
        "/api/bookings",
        json={
            "venue_id": 1,
            "venue_name": "会议室A",
            "booking_date": "2026-06-16",
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "user_name": "李四"
        }
    )

    response = client.get(f"/api/bookings?date={TEST_DATE}")
    assert response.status_code == 200
    bookings = response.json()
    assert len(bookings) == 1
    assert bookings[0]["booking_date"] == TEST_DATE
