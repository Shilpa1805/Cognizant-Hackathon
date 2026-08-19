"""
Router: /auth
Endpoints for user signup and login with passlib/bcrypt password hashing and DB persistence.
"""

import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User as UserModel
from app.schemas.auth import SignupRequest, LoginRequest, AuthResponse, UserOut

# Try importing JOSE for JWT signing, fallback to string token
try:
    from jose import jwt
    HAS_JOSE = True
except ImportError:
    HAS_JOSE = False

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter()


def _create_access_token(data: dict) -> str:
    if HAS_JOSE:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return f"token_{data.get('sub', 'user')}_{int(datetime.utcnow().timestamp())}"


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    """Register a new user in the database."""
    existing = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )

    hashed_password = pwd_context.hash(payload.password)
    user_record = UserModel(
        user_id=uuid.uuid4(),
        name=payload.name,
        email=payload.email,
        password_hash=hashed_password,
        role=payload.role,
        created_at=datetime.utcnow(),
    )
    db.add(user_record)
    db.commit()
    db.refresh(user_record)

    user_out = UserOut.model_validate(user_record)
    token = _create_access_token({"sub": str(user_record.user_id), "email": user_record.email})
    return AuthResponse(access_token=token, user=user_out)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    """Authenticate existing user credentials."""
    user_record = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if not user_record or not pwd_context.verify(payload.password, user_record.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    user_out = UserOut.model_validate(user_record)
    token = _create_access_token({"sub": str(user_record.user_id), "email": user_record.email})
    return AuthResponse(access_token=token, user=user_out)

