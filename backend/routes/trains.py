"""Train CRUD routes"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from database.db import TrainRecord
from models.schemas import TrainSchema
from typing import List
import random
from datetime import datetime

router = APIRouter()


def _randomize_train(train: TrainRecord):
    """Slightly randomize live data for simulation effect"""
    train.speed = round(max(0, train.speed + random.uniform(-3, 3)), 1)
    train.delay_minutes = round(max(0, train.delay_minutes + random.uniform(-0.5, 1.0)), 1)
    return train


@router.get("/trains", response_model=List[TrainSchema])
async def get_trains(db: Session = Depends(get_db)):
    trains = db.query(TrainRecord).filter(TrainRecord.is_active == True).all()
    for t in trains:
        _randomize_train(t)
    return trains


@router.get("/train/{train_id}", response_model=TrainSchema)
async def get_train(train_id: str, db: Session = Depends(get_db)):
    train = db.query(TrainRecord).filter(TrainRecord.train_id == train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
    _randomize_train(train)
    return train


@router.get("/reports")
async def get_reports(db: Session = Depends(get_db)):
    trains = db.query(TrainRecord).all()
    total = len(trains)
    critical = sum(1 for t in trains if t.risk_level == "Critical")
    high = sum(1 for t in trains if t.risk_level == "High")
    avg_delay = sum(t.delay_minutes or 0 for t in trains) / max(total, 1)
    risk_dist = {"Critical": critical, "High": high,
                 "Medium": sum(1 for t in trains if t.risk_level == "Medium"),
                 "Low": sum(1 for t in trains if t.risk_level == "Low")}
    delay_data = [{"train_id": t.train_id, "delay": t.delay_minutes, "route": t.route} for t in trains]
    return {
        "total_trains": total,
        "critical_count": critical,
        "avg_delay": round(avg_delay, 1),
        "risk_distribution": risk_dist,
        "delay_data": delay_data,
        "generated_at": datetime.utcnow().isoformat(),
    }
