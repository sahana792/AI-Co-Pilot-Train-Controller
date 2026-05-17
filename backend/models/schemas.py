"""Pydantic schemas"""
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TrainSchema(BaseModel):
    train_id: str
    train_name: Optional[str] = None
    train_number: Optional[str] = None
    route: str
    source: Optional[str] = None
    destination: Optional[str] = None
    current_station: str
    next_station: str
    speed: float
    signal_status: str
    weather: str
    congestion_level: str
    delay_minutes: float
    detected_objects: List[str]
    risk_level: str
    run_status: Optional[str] = "running"
    recommendation: str
    platform: Optional[str] = None
    arrival_time: Optional[str] = None
    departure_time: Optional[str] = None
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


class AlertSchema(BaseModel):
    id: Optional[int] = None
    train_id: str
    alert_type: str
    severity: str
    message: str
    timestamp: Optional[datetime] = None
    resolved: bool = False

    class Config:
        from_attributes = True


class PlatformSchema(BaseModel):
    platform_id: str
    station: str
    assigned_train: Optional[str] = None
    status: str
    crowd_level: str

    class Config:
        from_attributes = True


class SignalSchema(BaseModel):
    signal_id: str
    location: str
    status: str
    controlled_track: str
    last_updated: Optional[datetime] = None

    class Config:
        from_attributes = True


class DetectionResult(BaseModel):
    object_name: str
    confidence: float
    risk_severity: str
    bbox: List[float]


class YOLOResponse(BaseModel):
    detections: List[DetectionResult]
    alerts: List[str]
    overall_risk: str
    image_base64: Optional[str] = None


class DelayPredictionRequest(BaseModel):
    speed: float
    distance: float
    weather: str
    signal_status: str
    congestion: str
    previous_delay: float
    detected_risk_count: int


class DelayPredictionResponse(BaseModel):
    predicted_delay: float
    confidence: float
    factors: Dict[str, Any]


class RiskDetectionRequest(BaseModel):
    train_id: str
    speed: float
    signal_status: str
    detected_objects: List[str]
    congestion_level: str


class RiskResponse(BaseModel):
    risk_level: str
    risk_score: float
    risk_factors: List[str]


class RecommendationRequest(BaseModel):
    train_id: str
    risk_level: str
    detected_objects: List[str]
    delay_minutes: float
    speed: float
    signal_status: str
    congestion_level: str


class RecommendationResponse(BaseModel):
    actions: List[str]
    priority: str
    automated_actions: List[str]


class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    response: str
    related_trains: Optional[List[str]] = None
    alerts: Optional[List[str]] = None


class PlatformAllocateRequest(BaseModel):
    train_id: str
    priority: str = "Normal"
    estimated_arrival: Optional[str] = None


class SignalControlRequest(BaseModel):
    signal_id: str
    new_status: str
    reason: str


class RouteConflictRequest(BaseModel):
    train_id_1: str
    train_id_2: str
    track: str


class EmergencyOverrideRequest(BaseModel):
    train_id: str
    action: str
    reason: str
    override_level: str = "Standard"
