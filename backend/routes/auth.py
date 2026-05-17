"""Auth routes"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from models.schemas import LoginRequest, TokenResponse

router = APIRouter()
SECRET_KEY = "railway-ai-copilot-secret-2024"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

USERS = {
    "controller": {"password": pwd_context.hash("railway123"), "role": "controller"},
    "admin": {"password": pwd_context.hash("admin123"), "role": "admin"},
    "demo": {"password": pwd_context.hash("demo"), "role": "controller"},
}


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=24)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    user = USERS.get(req.username)
    if not user or not pwd_context.verify(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": req.username, "role": user["role"]})
    return TokenResponse(access_token=token)
