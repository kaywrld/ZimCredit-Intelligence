from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.models import (
    Gender, MaritalStatus, PropertyDensity, PropertyOwnership,
    SearchPurpose, SearchStatus, LoanStatus, RejectionReason
)
import re


# ── Address ──────────────────────────────

class AddressCreate(BaseModel):
    street_no: Optional[str] = None
    street_name: str
    suburb: Optional[str] = None
    building: Optional[str] = None
    po_box: Optional[str] = None
    city: str
    country: str = "Zimbabwe"
    phone: Optional[str] = None
    mobile: str
    email: Optional[str] = None
    property_density: PropertyDensity
    property_ownership: PropertyOwnership


class AddressResponse(BaseModel):
    id: str
    street_no: Optional[str]
    street_name: str
    suburb: Optional[str]
    city: str
    country: str
    mobile: Optional[str]
    property_density: Optional[PropertyDensity]
    property_ownership: Optional[PropertyOwnership]
    is_current: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Employment ──────────────────────────────

class EmploymentCreate(BaseModel):
    employer: Optional[str] = None
    occupation: Optional[str] = None
    industry: Optional[str] = None
    salary_band_usd: Optional[str] = None


class EmploymentResponse(BaseModel):
    id: str
    employer: Optional[str]
    occupation: Optional[str]
    industry: Optional[str]
    salary_band_usd: Optional[str]
    is_current: bool

    class Config:
        from_attributes = True


# ── Individual ──────────────────────────────

class IndividualCreate(BaseModel):
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    nationality: str = "Zimbabwean"
    national_id: Optional[str] = None
    passport_number: Optional[str] = None
    drivers_licence: Optional[str] = None
    gender: Gender
    date_of_birth: datetime
    marital_status: MaritalStatus
    is_foreigner: bool = False

    @field_validator("national_id")
    @classmethod
    def validate_zim_id(cls, v, info):
        if v and not info.data.get("is_foreigner", False):
            # Zimbabwean ID format: XX-XXXXXXX-X-XX (e.g. 63-123456-A-50)
            pattern = r"^\d{2}-\d{6,7}[A-Z]-\d{2}$"
            if not re.match(pattern, v.upper()):
                raise ValueError("Invalid Zimbabwean National ID format. Expected: XX-XXXXXXX-X-XX")
        return v.upper() if v else v


class IndividualResponse(BaseModel):
    id: str
    first_name: str
    middle_name: Optional[str]
    last_name: str
    nationality: str
    national_id: Optional[str]
    passport_number: Optional[str]
    gender: Gender
    date_of_birth: datetime
    marital_status: MaritalStatus
    is_foreigner: bool
    credit_score: Optional[int]
    addresses: List[AddressResponse] = []
    employment: List[EmploymentResponse] = []

    class Config:
        from_attributes = True


# ── Individual Search ──────────────────────────────

class IndividualSearchCreate(BaseModel):
    # Step 1 - Personal
    search_purpose: SearchPurpose
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    nationality: str = "Zimbabwean"
    national_id: Optional[str] = None
    passport_number: Optional[str] = None
    drivers_licence: Optional[str] = None
    gender: Gender
    date_of_birth: datetime
    marital_status: MaritalStatus
    is_foreigner: bool = False

    # Step 2 - Contact
    address: AddressCreate

    # Step 3 - Optional loan info
    loan_purpose: Optional[str] = None
    loan_amount: Optional[float] = None
    employer: Optional[str] = None
    occupation: Optional[str] = None
    industry: Optional[str] = None
    salary_band_usd: Optional[str] = None


class IndividualSearchResponse(BaseModel):
    id: str
    search_ref: str
    search_purpose: SearchPurpose
    status: SearchStatus
    credit_score: Optional[int]
    loan_purpose: Optional[str]
    loan_amount: Optional[float]
    rejection_reason: Optional[RejectionReason]
    rejection_comments: Optional[str]
    confirmation_reason: Optional[str]
    individual: Optional[IndividualResponse]
    created_at: datetime
    updated_at: datetime
    processed_at: Optional[datetime]

    class Config:
        from_attributes = True


class IndividualSearchListResponse(BaseModel):
    id: str
    search_ref: str
    search_purpose: SearchPurpose
    status: SearchStatus
    credit_score: Optional[int]
    created_at: datetime
    individual_name: Optional[str] = None
    individual_id_number: Optional[str] = None

    class Config:
        from_attributes = True


# ── Confirmation Response ──────────────────────────────

class ConfirmationSubmit(BaseModel):
    response: str


# ── Admin status update ──────────────────────────────

class SearchStatusUpdate(BaseModel):
    status: SearchStatus
    credit_score: Optional[int] = None
    rejection_reason: Optional[RejectionReason] = None
    rejection_comments: Optional[str] = None
    confirmation_reason: Optional[str] = None
