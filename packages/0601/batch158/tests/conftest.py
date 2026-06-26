import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.email_service import MockSendGridService, set_email_service
from app.main import app


SQLALCHEMY_DATABASE_URL = "sqlite:///file::memory:?cache=shared&uri=true"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def email_svc():
    svc = MockSendGridService()
    set_email_service(svc)
    yield svc
    set_email_service(None)


@pytest.fixture()
def sample_animal(client):
    resp = client.post(
        "/animals",
        json={"name": "大黄", "species": "犬", "breed": "中华田园犬", "age": "3岁"},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture()
def sample_animal_2(client):
    resp = client.post(
        "/animals",
        json={"name": "咪咪", "species": "猫", "breed": "橘猫", "age": "2岁"},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture()
def sample_application(client, sample_animal):
    resp = client.post(
        "/applications",
        json={
            "applicant_name": "张三",
            "applicant_phone": "13800001111",
            "applicant_email": "zhangsan@example.com",
            "address": "北京市朝阳区某小区1号楼",
            "pet_experience": "养过一只猫3年",
            "animal_id": sample_animal["id"],
        },
    )
    assert resp.status_code == 201
    return resp.json()
