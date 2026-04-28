from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.models import UserRole, SubscriberStatus


# ── Subscriber ──────────────────────────────

class SubscriberCreate(BaseModel):
    name: str
    trading_name: Optional[str] = None
    registration_number: Optional[str] = None
    industry: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: EmailStr
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    subscription_plan: str = "standard"
    max_searches_per_month: int = 500


class SubscriberUpdate(BaseModel):
    name: Optional[str] = None
    trading_name: Optional[str] = None
    industry: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    status: Optional[SubscriberStatus] = None
    max_searches_per_month: Optional[int] = None


class SubscriberResponse(BaseModel):
    id: str
    name: str
    trading_name: Optional[str]
    registration_number: Optional[str]
    industry: Optional[str]
    email: str
    status: SubscriberStatus
    subscription_plan: str
    max_searches_per_month: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── User ──────────────────────────────

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    mobile: Optional[str] = None
    phone: Optional[str] = None
    branch: Optional[str] = None
    role: UserRole = UserRole.SUBSCRIBER
    subscriber_id: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    mobile: Optional[str] = None
    phone: Optional[str] = None
    branch: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    mobile: Optional[str]
    phone: Optional[str]
    branch: Optional[str]
    role: UserRole
    is_active: bool
    subscriber_id: Optional[str]
    profile_image: Optional[str]
    last_login: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
