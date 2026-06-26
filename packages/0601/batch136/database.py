import time
import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, event, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.exc import IntegrityError, OperationalError
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./visitor.db"

PHOTO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "photos")
THUMBNAIL_DIR = os.path.join(PHOTO_DIR, "thumbnails")
os.makedirs(PHOTO_DIR, exist_ok=True)
os.makedirs(THUMBNAIL_DIR, exist_ok=True)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 15},
    pool_pre_ping=True,
    isolation_level="SERIALIZABLE",
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class Visitor(Base):
    __tablename__ = "visitors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String, index=True)
    room_number = Column(String, index=True)
    estimated_stay = Column(Integer)
    photo_path = Column(String, nullable=True)
    thumbnail_path = Column(String, nullable=True)
    check_in_time = Column(DateTime, default=datetime.utcnow)
    check_out_time = Column(DateTime, nullable=True)
    is_checked_out = Column(Boolean, default=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)


class Blacklist(Base):
    __tablename__ = "blacklists"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class WebhookConfig(Base):
    __tablename__ = "webhook_configs"

    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String, unique=True, index=True, nullable=False)
    webhook_url = Column(String, nullable=False)
    max_retries = Column(Integer, default=3)
    retry_delay_seconds = Column(Integer, default=60)
    created_at = Column(DateTime, default=datetime.utcnow)


class WebhookLog(Base):
    __tablename__ = "webhook_logs"

    id = Column(Integer, primary_key=True, index=True)
    visitor_id = Column(Integer, nullable=False)
    room_number = Column(String, index=True, nullable=False)
    webhook_url = Column(String, nullable=False)
    payload = Column(Text, nullable=False)
    status = Column(String, default="pending")
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    last_attempt_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)


def retry_db_write(operation, max_retries=3, base_delay=0.1):
    for attempt in range(max_retries):
        try:
            return operation()
        except (IntegrityError, OperationalError):
            if attempt == max_retries - 1:
                raise
            time.sleep(base_delay * (2 ** attempt))
