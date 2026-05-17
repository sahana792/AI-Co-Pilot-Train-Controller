"""Database setup and models"""
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./railway.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class TrainRecord(Base):
    __tablename__ = "trains"
    id = Column(Integer, primary_key=True, index=True)
    train_id = Column(String, unique=True, index=True)
    train_name = Column(String, nullable=True)
    train_number = Column(String, nullable=True)
    route = Column(String)
    source = Column(String, nullable=True)
    destination = Column(String, nullable=True)
    current_station = Column(String)
    next_station = Column(String)
    speed = Column(Float)
    signal_status = Column(String)
    weather = Column(String)
    congestion_level = Column(String)
    delay_minutes = Column(Float, default=0)
    detected_objects = Column(JSON, default=[])
    risk_level = Column(String, default="Low")
    run_status = Column(String, default="running")
    recommendation = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    platform = Column(String, nullable=True)
    arrival_time = Column(String, nullable=True)
    departure_time = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)


class AlertRecord(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    train_id = Column(String)
    alert_type = Column(String)
    severity = Column(String)
    message = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)


class PlatformRecord(Base):
    __tablename__ = "platforms"
    id = Column(Integer, primary_key=True, index=True)
    platform_id = Column(String, unique=True)
    station = Column(String)
    assigned_train = Column(String, nullable=True)
    status = Column(String, default="available")
    crowd_level = Column(String, default="Low")
    arrival_time = Column(DateTime, nullable=True)
    departure_time = Column(DateTime, nullable=True)


class SignalRecord(Base):
    __tablename__ = "signals"
    id = Column(Integer, primary_key=True, index=True)
    signal_id = Column(String, unique=True)
    location = Column(String)
    status = Column(String, default="Green")
    controlled_track = Column(String)
    last_updated = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
