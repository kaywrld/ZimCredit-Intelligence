"""
ZimCredit Intelligence - Database Models
All tables for Phase 1
"""
import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, Text, Enum as SAEnum, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db.database import Base


def gen_uuid():
    return str(uuid.uuid4())


# ─────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"   # ZCI bureau staff - full access
    ADMIN = "admin"               # ZCI bureau staff - limited
    SUBSCRIBER = "subscriber"     # Company user (bank, microfinance)
    READ_ONLY = "read_only"       # Subscriber who can only view


class SubscriberStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"
    INACTIVE = "inactive"


class SearchStatus(str, enum.Enum):
    OPEN = "open"               # Submitted, awaiting processing
    PROCESSING = "processing"   # Being reviewed by bureau
    GOOD = "good"
    GREEN = "green"
    ADVERSE = "adverse"
    PEP = "pep"                 # Politically Exposed Person
    FAIR = "fair"
    INCONCLUSIVE = "inconclusive"
    REJECTED = "rejected"
    CONFIRMATION = "confirmation"  # Bureau needs more info
    CONFIRMED = "confirmed"        # User responded to confirmation
    INCOMPLETE = "incomplete"


class SearchPurpose(str, enum.Enum):
    NEW_CUSTOMER_KYC = "New Customer (KYC)"
    EXISTING_CUSTOMER = "Existing Customer"
    PERIODIC_ACCOUNT_REVIEW = "Periodic Account Review"
    CREDIT_APPLICATION = "Credit Application"
    EMPLOYMENT_VETTING = "Employment Vetting"
    TENANT_VETTING = "Tenant Vetting"
    BUSINESS_PARTNER = "Business Partner"
    OTHER = "Other"


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class MaritalStatus(str, enum.Enum):
    SINGLE = "single"
    MARRIED = "married"
    DIVORCED = "divorced"
    WIDOWED = "widowed"
    UNSPECIFIED = "unspecified"


class PropertyDensity(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class PropertyOwnership(str, enum.Enum):
    OWNED = "Owned"
    RENTED = "Rented"
    MORTGAGED = "Mortgaged"
    OTHER = "Other"


class CompanyType(str, enum.Enum):
    PRIVATE_LIMITED = "Private Limited Company"
    PUBLIC_LIMITED = "Public Limited Company"
    PARTNERSHIP = "Partnership"
    SOLE_TRADER = "Sole Trader"
    CLUB_ASSOCIATION = "Club/Association"
    NGO = "NGO"
    GOVERNMENT = "Government Entity"
    OTHER = "Other"


class LoanStatus(str, enum.Enum):
    PERFORMING = "performing"       # Paying on time
    DELINQUENT = "delinquent"       # Late payments
    DEFAULT = "default"             # Non-performing
    WRITTEN_OFF = "written_off"     # Written off by lender
    SETTLED = "settled"             # Fully repaid
    RESTRUCTURED = "restructured"   # Loan terms changed


class RejectionReason(str, enum.Enum):
    INCORRECT_ID = "Incorrect ID Number"
    DUPLICATE_ID = "ID Used by Another Individual"
    INCORRECT_ADDRESS = "Incorrect Address"
    MULTIPLE_IDS = "Individual with Multiple ID Numbers"
    NOT_ENOUGH_DIRECTORS = "Not Enough Directors"
    MISSING_REG_NO = "Incorrect or Missing Registration Number"
    OTHER = "Other"


# ─────────────────────────────────────────────
# SUBSCRIBER (Member companies - banks, microfinance etc.)
# ─────────────────────────────────────────────

class Subscriber(Base):
    __tablename__ = "subscribers"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)           # Company name
    trading_name = Column(String(255), nullable=True)
    registration_number = Column(String(100), unique=True, nullable=True)
    industry = Column(String(100), nullable=True)        # Banking, Microfinance, Insurance etc.

    # Legacy fields (kept for backward compat / seed)
    phone = Column(String(20), nullable=True)
    mobile = Column(String(20), nullable=True)
    email = Column(String(255), unique=True, nullable=True)
    website = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)

    # Extended contact fields
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    contact_phone2 = Column(String(20), nullable=True)
    physical_address = Column(Text, nullable=True)
    postal_address = Column(Text, nullable=True)

    # Primary contact person
    contact_person_name = Column(String(255), nullable=True)
    contact_person_title = Column(String(255), nullable=True)
    contact_person_phone = Column(String(20), nullable=True)
    contact_person_email = Column(String(255), nullable=True)

    # Regulatory / licensing
    license_number = Column(String(100), nullable=True)
    regulator = Column(String(255), nullable=True)
    license_expiry = Column(DateTime, nullable=True)

    status = Column(SAEnum(SubscriberStatus), default=SubscriberStatus.PENDING, nullable=False)
    subscription_plan = Column(String(50), default="standard")
    max_searches_per_month = Column(Integer, default=500)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="subscriber", cascade="all, delete-orphan")
    individual_searches = relationship("IndividualSearch", back_populates="subscriber")
    company_searches = relationship("CompanySearch", back_populates="subscriber")
    loan_records = relationship("LoanRecord", back_populates="subscriber")

    def __repr__(self):
        return f"<Subscriber {self.name}>"


# ─────────────────────────────────────────────
# USER
# ─────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    subscriber_id = Column(String, ForeignKey("subscribers.id", ondelete="CASCADE"), nullable=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    mobile = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=True)
    branch = Column(String(100), nullable=True)
    role = Column(SAEnum(UserRole), default=UserRole.SUBSCRIBER, nullable=False)
    is_active = Column(Boolean, default=True)
    profile_image = Column(String(500), nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    # Relationships
    subscriber = relationship("Subscriber", back_populates="users")
    individual_searches = relationship(
        "IndividualSearch",
        back_populates="created_by_user",
        foreign_keys="IndividualSearch.created_by_user_id"
    )
    company_searches = relationship(
        "CompanySearch",
        back_populates="created_by_user",
        foreign_keys="CompanySearch.created_by_user_id"
    )

    __table_args__ = (
        Index("ix_users_email", "email"),
    )

    def __repr__(self):
        return f"<User {self.email} [{self.role}]>"


# ─────────────────────────────────────────────
# INDIVIDUAL (Person being searched/reported)
# ─────────────────────────────────────────────

class Individual(Base):
    __tablename__ = "individuals"

    id = Column(String, primary_key=True, default=gen_uuid)
    first_name = Column(String(100), nullable=False)
    middle_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=False)
    nationality = Column(String(100), nullable=False, default="Zimbabwean")
    national_id = Column(String(50), nullable=True, index=True)
    passport_number = Column(String(50), nullable=True, index=True)
    drivers_licence = Column(String(50), nullable=True)
    gender = Column(SAEnum(Gender), nullable=False)
    date_of_birth = Column(DateTime, nullable=False)
    marital_status = Column(SAEnum(MaritalStatus), nullable=False)
    is_foreigner = Column(Boolean, default=False)

    # Credit score (computed and stored)
    credit_score = Column(Integer, nullable=True)  # 0-999
    credit_score_updated_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    addresses = relationship("IndividualAddress", back_populates="individual", cascade="all, delete-orphan")
    employment = relationship("IndividualEmployment", back_populates="individual", cascade="all, delete-orphan")
    searches = relationship("IndividualSearch", back_populates="individual")
    loan_records = relationship("LoanRecord", back_populates="individual")

    __table_args__ = (
        Index("ix_individuals_national_id", "national_id"),
        Index("ix_individuals_passport", "passport_number"),
        Index("ix_individuals_name", "last_name", "first_name"),
    )

    @property
    def full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return " ".join(p for p in parts if p)

    def __repr__(self):
        return f"<Individual {self.full_name} [{self.national_id}]>"


class IndividualAddress(Base):
    __tablename__ = "individual_addresses"

    id = Column(String, primary_key=True, default=gen_uuid)
    individual_id = Column(String, ForeignKey("individuals.id", ondelete="CASCADE"), nullable=False)
    street_no = Column(String(50), nullable=True)
    street_name = Column(String(200), nullable=False)
    suburb = Column(String(100), nullable=True)
    building = Column(String(100), nullable=True)
    po_box = Column(String(50), nullable=True)
    city = Column(String(100), nullable=False)
    country = Column(String(100), default="Zimbabwe")
    phone = Column(String(20), nullable=True)
    mobile = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    property_density = Column(SAEnum(PropertyDensity), nullable=True)
    property_ownership = Column(SAEnum(PropertyOwnership), nullable=True)
    is_current = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    individual = relationship("Individual", back_populates="addresses")


class IndividualEmployment(Base):
    __tablename__ = "individual_employment"

    id = Column(String, primary_key=True, default=gen_uuid)
    individual_id = Column(String, ForeignKey("individuals.id", ondelete="CASCADE"), nullable=False)
    employer = Column(String(255), nullable=True)
    occupation = Column(String(100), nullable=True)
    industry = Column(String(100), nullable=True)
    salary_band_usd = Column(String(50), nullable=True)  # e.g. "500-1000"
    is_current = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    individual = relationship("Individual", back_populates="employment")


# ─────────────────────────────────────────────
# COMPANY (Business being searched)
# ─────────────────────────────────────────────

class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False, index=True)
    trading_name = Column(String(255), nullable=True)
    company_type = Column(SAEnum(CompanyType), nullable=False)
    nationality = Column(String(100), default="Zimbabwe")
    registration_number = Column(String(100), nullable=True, index=True)
    registration_year = Column(String(10), nullable=True)
    date_of_formation = Column(DateTime, nullable=True)
    vat_number = Column(String(50), nullable=True)
    tin_number = Column(String(50), nullable=True)
    registration_town = Column(String(100), nullable=True)
    business_sector = Column(String(100), nullable=True)
    goods_services = Column(Text, nullable=True)
    insurer = Column(String(100), nullable=True)

    # Financials
    total_assets = Column(Float, nullable=True)
    gross_annual_revenue = Column(Float, nullable=True)
    total_expenses = Column(Float, nullable=True)

    credit_score = Column(Integer, nullable=True)
    credit_score_updated_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    addresses = relationship("CompanyAddress", back_populates="company", cascade="all, delete-orphan")
    directors = relationship("Director", back_populates="company", cascade="all, delete-orphan")
    shareholders = relationship("Shareholder", back_populates="company", cascade="all, delete-orphan")
    searches = relationship("CompanySearch", back_populates="company")

    __table_args__ = (
        Index("ix_companies_name", "name"),
        Index("ix_companies_reg_no", "registration_number"),
    )

    def __repr__(self):
        return f"<Company {self.name}>"


class CompanyAddress(Base):
    __tablename__ = "company_addresses"

    id = Column(String, primary_key=True, default=gen_uuid)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    street_no = Column(String(50), nullable=True)
    street_name = Column(String(200), nullable=False)
    suburb = Column(String(100), nullable=True)
    building = Column(String(100), nullable=True)
    po_box = Column(String(50), nullable=True)
    city = Column(String(100), nullable=False)
    country = Column(String(100), default="Zimbabwe")
    phone = Column(String(20), nullable=True)
    mobile = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    property_density = Column(SAEnum(PropertyDensity), nullable=True)
    property_ownership = Column(SAEnum(PropertyOwnership), nullable=True)
    is_current = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="addresses")


class Director(Base):
    __tablename__ = "directors"

    id = Column(String, primary_key=True, default=gen_uuid)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    # Link to an individual record
    individual_id = Column(String, ForeignKey("individuals.id"), nullable=True)

    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    nationality = Column(String(100), nullable=False)
    national_id = Column(String(50), nullable=True)
    passport_number = Column(String(50), nullable=True)
    gender = Column(SAEnum(Gender), nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    marital_status = Column(SAEnum(MaritalStatus), nullable=True)

    credit_score = Column(Integer, nullable=True)
    status = Column(SAEnum(SearchStatus), default=SearchStatus.OPEN)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="directors")
    individual = relationship("Individual")

    def __repr__(self):
        return f"<Director {self.first_name} {self.last_name}>"


class Shareholder(Base):
    __tablename__ = "shareholders"

    id = Column(String, primary_key=True, default=gen_uuid)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    director_id = Column(String, ForeignKey("directors.id"), nullable=True)  # If director is also shareholder
    name = Column(String(255), nullable=False)
    shareholding_percentage = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="shareholders")
    director = relationship("Director")


# ─────────────────────────────────────────────
# SEARCHES
# ─────────────────────────────────────────────

class IndividualSearch(Base):
    __tablename__ = "individual_searches"

    id = Column(String, primary_key=True, default=gen_uuid)
    search_ref = Column(String(20), unique=True, nullable=False)  # e.g. IND-20240001
    subscriber_id = Column(String, ForeignKey("subscribers.id"), nullable=False)
    created_by_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    individual_id = Column(String, ForeignKey("individuals.id"), nullable=True)

    search_purpose = Column(SAEnum(SearchPurpose), nullable=False)
    status = Column(SAEnum(SearchStatus), default=SearchStatus.OPEN, nullable=False)
    credit_score = Column(Integer, nullable=True)

    # Loan info at time of search
    loan_purpose = Column(String(100), nullable=True)
    loan_amount = Column(Float, nullable=True)

    # ZCI processing
    processed_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    processed_at = Column(DateTime, nullable=True)
    rejection_reason = Column(SAEnum(RejectionReason), nullable=True)
    rejection_comments = Column(Text, nullable=True)
    confirmation_reason = Column(Text, nullable=True)
    confirmation_response = Column(Text, nullable=True)

    # Report
    report_generated_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    subscriber = relationship("Subscriber", back_populates="individual_searches")
    individual = relationship("Individual", back_populates="searches")
    created_by_user = relationship("User", back_populates="individual_searches", foreign_keys=[created_by_user_id])
    processed_by = relationship("User", foreign_keys=[processed_by_id])

    __table_args__ = (
        Index("ix_ind_searches_ref", "search_ref"),
        Index("ix_ind_searches_status", "status"),
        Index("ix_ind_searches_subscriber", "subscriber_id"),
    )


class CompanySearch(Base):
    __tablename__ = "company_searches"

    id = Column(String, primary_key=True, default=gen_uuid)
    search_ref = Column(String(20), unique=True, nullable=False)  # e.g. COM-20240001
    subscriber_id = Column(String, ForeignKey("subscribers.id"), nullable=False)
    created_by_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)

    search_purpose = Column(SAEnum(SearchPurpose), nullable=False)
    status = Column(SAEnum(SearchStatus), default=SearchStatus.OPEN, nullable=False)
    credit_score = Column(Integer, nullable=True)

    loan_purpose = Column(String(100), nullable=True)
    loan_amount = Column(Float, nullable=True)

    processed_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    processed_at = Column(DateTime, nullable=True)
    rejection_reason = Column(SAEnum(RejectionReason), nullable=True)
    rejection_comments = Column(Text, nullable=True)
    confirmation_reason = Column(Text, nullable=True)
    confirmation_response = Column(Text, nullable=True)

    report_generated_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    subscriber = relationship("Subscriber", back_populates="company_searches")
    company = relationship("Company", back_populates="searches")
    created_by_user = relationship("User", back_populates="company_searches", foreign_keys=[created_by_user_id])
    processed_by = relationship("User", foreign_keys=[processed_by_id])

    __table_args__ = (
        Index("ix_com_searches_ref", "search_ref"),
        Index("ix_com_searches_status", "status"),
        Index("ix_com_searches_subscriber", "subscriber_id"),
    )


# ─────────────────────────────────────────────
# LOAN RECORDS (Submitted by subscribers - the credit data)
# ─────────────────────────────────────────────

class LoanRecord(Base):
    """
    This is the core data submitted by subscriber companies (banks, microfinance).
    When a company submits their loan book, each loan creates one of these records.
    This feeds into the credit scoring and adverse flagging.
    """
    __tablename__ = "loan_records"

    id = Column(String, primary_key=True, default=gen_uuid)
    subscriber_id = Column(String, ForeignKey("subscribers.id"), nullable=False)
    individual_id = Column(String, ForeignKey("individuals.id"), nullable=True)

    # Loan details
    loan_reference = Column(String(100), nullable=True)   # Subscriber's own loan ref
    loan_amount = Column(Float, nullable=False)
    outstanding_balance = Column(Float, nullable=True)
    loan_purpose = Column(String(100), nullable=True)
    loan_start_date = Column(DateTime, nullable=True)
    loan_end_date = Column(DateTime, nullable=True)
    installment_amount = Column(Float, nullable=True)
    installment_frequency = Column(String(50), nullable=True)  # monthly, weekly etc.

    # Status
    status = Column(SAEnum(LoanStatus), nullable=False, default=LoanStatus.PERFORMING)
    days_in_arrears = Column(Integer, default=0)
    times_defaulted = Column(Integer, default=0)
    date_of_default = Column(DateTime, nullable=True)
    date_settled = Column(DateTime, nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    subscriber = relationship("Subscriber", back_populates="loan_records")
    individual = relationship("Individual", back_populates="loan_records")

    __table_args__ = (
        Index("ix_loan_records_individual", "individual_id"),
        Index("ix_loan_records_status", "status"),
        Index("ix_loan_records_subscriber", "subscriber_id"),
    )