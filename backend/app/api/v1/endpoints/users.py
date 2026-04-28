from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel, EmailStr

from app.db.database import get_db
from app.models.models import User, Subscriber, UserRole, SubscriberStatus, IndividualSearch, CompanySearch, Individual
from app.schemas.users import (
    UserCreate, UserUpdate, UserResponse,
    SubscriberCreate, SubscriberUpdate, SubscriberResponse
)
from app.core.security import get_password_hash
from app.services.auth_service import get_current_user, get_admin_user, get_super_admin

router = APIRouter(prefix="/users", tags=["Users"])
sub_router = APIRouter(prefix="/subscribers", tags=["Subscribers"])

COST_PER_SEARCH = 0.05


# ════════════════════════════════════════════════════════════════════════════════
# SCHEMAS  (inline — add to app/schemas/users.py if you prefer)
# ════════════════════════════════════════════════════════════════════════════════

class SubscriberCreateFull(BaseModel):
    """Full subscriber creation payload matching the Add Subscriber form."""
    # Company
    name: str
    registration_number: Optional[str] = None
    industry: Optional[str] = None
    physical_address: Optional[str] = None
    postal_address: Optional[str] = None
    # Contact
    contact_email: str
    contact_phone: str
    contact_phone2: Optional[str] = None
    website: Optional[str] = None
    # Primary contact person
    contact_person_name: Optional[str] = None
    contact_person_title: Optional[str] = None
    contact_person_phone: Optional[str] = None
    contact_person_email: Optional[str] = None
    # License / regulatory
    license_number: Optional[str] = None
    regulator: Optional[str] = None
    license_expiry: Optional[date] = None


class SubscriberUpdateFull(BaseModel):
    """Partial update — every field optional."""
    name: Optional[str] = None
    registration_number: Optional[str] = None
    industry: Optional[str] = None
    physical_address: Optional[str] = None
    postal_address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_phone2: Optional[str] = None
    website: Optional[str] = None
    contact_person_name: Optional[str] = None
    contact_person_title: Optional[str] = None
    contact_person_phone: Optional[str] = None
    contact_person_email: Optional[str] = None
    license_number: Optional[str] = None
    regulator: Optional[str] = None
    license_expiry: Optional[date] = None
    status: Optional[SubscriberStatus] = None


class UserAddToSubscriber(BaseModel):
    """
    Payload for adding a Main Admin or Standard User to a subscriber.

    role must be one of:
        "main_admin"   — can add/manage other users + search + download reports
        "standard_user"— can search and download reports only
    """
    full_name: str
    email: EmailStr
    mobile: Optional[str] = None
    phone: Optional[str] = None
    password: str
    role: str = "standard_user"   # "main_admin" | "standard_user"


# ════════════════════════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════════════════════════

def _role_from_string(role_str: str) -> UserRole:
    """Map the two UI role names to the UserRole enum."""
    mapping = {
        "main_admin":    UserRole.ADMIN,        # can manage users + search
        "standard_user": UserRole.READ_ONLY, # search & download only
    }
    role = mapping.get(role_str)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="role must be 'main_admin' or 'standard_user'"
        )
    return role


def _require_super_admin(user: User):
    if user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the super admin can perform this action"
        )


def _require_main_admin_or_above(user: User):
    """Main admins (ADMIN) and the super admin can manage users within a subscriber."""
    if user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )


async def _build_subscriber_detail(sub: Subscriber, db: AsyncSession) -> dict:
    """
    Build the full subscriber response dict including user list and search counts.
    Used by GET /subscribers/{id} and after create.
    """
    users_result = await db.execute(
        select(User)
        .where(User.subscriber_id == sub.id)
        .order_by(User.created_at.asc())
    )
    users = users_result.scalars().all()

    ind_count = (await db.execute(
        select(func.count(IndividualSearch.id))
        .where(IndividualSearch.subscriber_id == sub.id)
    )).scalar_one()

    com_count = (await db.execute(
        select(func.count(CompanySearch.id))
        .where(CompanySearch.subscriber_id == sub.id)
    )).scalar_one()

    total = ind_count + com_count

    return {
        "id": sub.id,
        # Company
        "name": sub.name,
        "registration_number": sub.registration_number,
        "industry": sub.industry,
        "physical_address": sub.physical_address,
        "postal_address": sub.postal_address,
        # Contact
        "contact_email": sub.contact_email,
        "contact_phone": sub.contact_phone,
        "contact_phone2": sub.contact_phone2,
        "website": sub.website,
        # Contact person
        "contact_person_name": sub.contact_person_name,
        "contact_person_title": sub.contact_person_title,
        "contact_person_phone": sub.contact_person_phone,
        "contact_person_email": sub.contact_person_email,
        # License
        "license_number": sub.license_number,
        "regulator": sub.regulator,
        "license_expiry": sub.license_expiry.isoformat() if sub.license_expiry else None,
        # Meta
        "status": sub.status,
        "created_at": sub.created_at.isoformat() if sub.created_at else None,
        "updated_at": sub.updated_at.isoformat() if sub.updated_at else None,
        # Stats
        "individual_searches": ind_count,
        "company_searches": com_count,
        "total_searches": total,
        "amount_owed": round(total * COST_PER_SEARCH, 2),
        # Users — both "users" and "admins" keys for compatibility
        "user_count": len(users),
        "users": [
            {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "mobile": u.mobile,
                "phone": u.phone,
                "branch": u.branch,
                # raw role value so frontend can compare ("admin" = main admin, "read_only" = standard)
                "role": u.role.value if hasattr(u.role, "value") else u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
    }


# ════════════════════════════════════════════════════════════════════════════════
# USER ROUTES  (/users/…)
# ════════════════════════════════════════════════════════════════════════════════

@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Logged-in user updates their own profile."""
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/", response_model=UserResponse)
async def create_user(
    data: UserCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a user (original endpoint — kept for backwards compatibility).
    Super admins can set any role and any subscriber_id.
    Main admins can only create standard_users within their own subscriber.
    """
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    if data.role == UserRole.SUPER_ADMIN and admin.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Cannot create super admin")

    # Main admins cannot assign users to other subscribers
    if admin.role == UserRole.ADMIN and data.subscriber_id != admin.subscriber_id:
        raise HTTPException(status_code=403, detail="Cannot assign user to a different subscriber")

    user = User(
        full_name=data.full_name,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        mobile=data.mobile,
        phone=data.phone,
        branch=data.branch,
        role=data.role,
        subscriber_id=data.subscriber_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/", response_model=List[UserResponse])
async def list_users(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    """
    Super admin sees all users.
    Main admin sees only users within their subscriber.
    """
    if admin.role == UserRole.SUPER_ADMIN:
        result = await db.execute(select(User).offset(skip).limit(limit))
    else:
        result = await db.execute(
            select(User)
            .where(User.subscriber_id == admin.subscriber_id)
            .offset(skip).limit(limit)
        )
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Main admins can only view users in their own subscriber
    if admin.role == UserRole.ADMIN and user.subscriber_id != admin.subscriber_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return user


@router.patch("/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Activate or deactivate a user. Main admins can only toggle users in their subscriber."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if admin.role == UserRole.ADMIN and user.subscriber_id != admin.subscriber_id:
        raise HTTPException(status_code=403, detail="Access denied")

    user.is_active = not user.is_active
    await db.commit()
    return {"is_active": user.is_active, "message": f"User {'activated' if user.is_active else 'deactivated'}"}


# ════════════════════════════════════════════════════════════════════════════════
# SUBSCRIBER ROUTES  (/subscribers/…)
# ════════════════════════════════════════════════════════════════════════════════

@sub_router.get("/")
async def list_subscribers(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
):
    """
    Super admin: all subscribers with per-row summary stats.
    Supports ?search= (name / email / industry) and ?status= filtering.
    Main admin: their own subscriber only.
    """
    if admin.role == UserRole.SUPER_ADMIN:
        query = select(Subscriber).order_by(Subscriber.created_at.desc())

        if search and search.strip():
            s = f"%{search.strip()}%"
            from sqlalchemy import or_
            query = query.where(
                or_(
                    Subscriber.name.ilike(s),
                    Subscriber.contact_email.ilike(s),
                    Subscriber.email.ilike(s),
                    Subscriber.industry.ilike(s),
                    Subscriber.registration_number.ilike(s),
                )
            )

        if status and status.strip():
            try:
                status_val = SubscriberStatus(status.strip())
                query = query.where(Subscriber.status == status_val)
            except ValueError:
                pass  # ignore invalid status values

        result = await db.execute(query.offset(skip).limit(limit))
        subscribers = result.scalars().all()
    else:
        result = await db.execute(
            select(Subscriber).where(Subscriber.id == admin.subscriber_id)
        )
        subscribers = result.scalars().all()

    rows = []
    for sub in subscribers:
        user_count = (await db.execute(
            select(func.count(User.id))
            .where(and_(User.subscriber_id == sub.id, User.is_active == True))
        )).scalar_one()

        ind = (await db.execute(
            select(func.count(IndividualSearch.id))
            .where(IndividualSearch.subscriber_id == sub.id)
        )).scalar_one()

        com = (await db.execute(
            select(func.count(CompanySearch.id))
            .where(CompanySearch.subscriber_id == sub.id)
        )).scalar_one()

        rows.append({
            "id": sub.id,
            "name": sub.name,
            "trading_name": sub.trading_name,
            "registration_number": sub.registration_number,
            "industry": sub.industry,
            "contact_email": sub.contact_email or sub.email,
            "contact_phone": sub.contact_phone or sub.phone,
            "website": sub.website,
            "status": sub.status,
            "user_count": user_count,
            "individual_searches": ind,
            "company_searches": com,
            "total_searches": ind + com,
            "amount_owed": round((ind + com) * COST_PER_SEARCH, 2),
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
        })

    return {"subscribers": rows, "total": len(rows)}


@sub_router.post("/", status_code=status.HTTP_201_CREATED)
async def create_subscriber(
    data: SubscriberCreateFull,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new subscriber company.
    Only the super admin can do this.
    """
    _require_super_admin(current_user)

    # Duplicate contact email check
    existing = (await db.execute(
        select(Subscriber).where(
            (Subscriber.contact_email == data.contact_email) |
            (Subscriber.email == data.contact_email)
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A subscriber with this email already exists"
        )

    payload = data.model_dump()
    # Sync legacy email field so existing code that reads sub.email still works
    payload["email"] = data.contact_email

    sub = Subscriber(
        **payload,
        status=SubscriberStatus.ACTIVE,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)

    return {"id": sub.id, "name": sub.name, "message": "Subscriber created successfully"}


@sub_router.get("/{subscriber_id}")
async def get_subscriber(
    subscriber_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Full subscriber detail including users list and search stats.
    Super admin can view any. Main admin / standard user can only view their own.
    """
    if (current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]
            and str(current_user.subscriber_id) != str(subscriber_id)):
        raise HTTPException(status_code=403, detail="Access denied")

    sub = (await db.execute(
        select(Subscriber).where(Subscriber.id == subscriber_id)
    )).scalar_one_or_none()

    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    return await _build_subscriber_detail(sub, db)


@sub_router.patch("/{subscriber_id}")
async def update_subscriber(
    subscriber_id: str,
    data: SubscriberUpdateFull,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update subscriber details or status.
    Super admin can update any subscriber and change status.
    Main admin can update their own subscriber's details but NOT change status.
    """
    _require_main_admin_or_above(current_user)

    sub = (await db.execute(
        select(Subscriber).where(Subscriber.id == subscriber_id)
    )).scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    # Main admins can only edit their own subscriber
    if (current_user.role == UserRole.ADMIN
            and str(current_user.subscriber_id) != str(subscriber_id)):
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = data.model_dump(exclude_unset=True)

    # Main admins cannot change status — only super admin can
    if current_user.role == UserRole.ADMIN and "status" in update_data:
        update_data.pop("status")

    for field, value in update_data.items():
        setattr(sub, field, value)

    sub.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(sub)

    return {"message": "Subscriber updated", "id": sub.id}


# ── kept for backwards compat — old PUT full-replace ─────────────────────────
@sub_router.put("/{subscriber_id}", response_model=SubscriberResponse)
async def update_subscriber_put(
    subscriber_id: str,
    data: SubscriberUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Legacy full-replace endpoint. Prefer PATCH for new code."""
    result = await db.execute(select(Subscriber).where(Subscriber.id == subscriber_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(sub, field, value)
    await db.commit()
    await db.refresh(sub)
    return sub


# ════════════════════════════════════════════════════════════════════════════════
# SUBSCRIBER USER MANAGEMENT  (/subscribers/{id}/users/…)
# These are the endpoints the frontend calls from SubscriberDetailPage
# ════════════════════════════════════════════════════════════════════════════════

@sub_router.post("/{subscriber_id}/users", status_code=status.HTTP_201_CREATED)
async def add_user_to_subscriber(
    subscriber_id: str,
    payload: UserAddToSubscriber,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Add a Main Admin or Standard User to a subscriber company.

    Who can call this:
      - Super admin  → any subscriber
      - Main admin   → only their own subscriber, and they can only create
                       standard_users (cannot create another main_admin)
    """
    _require_main_admin_or_above(current_user)

    # Scope check for main admins
    if current_user.role == UserRole.ADMIN:
        if str(current_user.subscriber_id) != str(subscriber_id):
            raise HTTPException(status_code=403, detail="Access denied")
        if payload.role == "main_admin":
            raise HTTPException(
                status_code=403,
                detail="Main admins can only create standard users"
            )

    # Confirm subscriber exists
    sub = (await db.execute(
        select(Subscriber).where(Subscriber.id == subscriber_id)
    )).scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    # Email uniqueness across the whole platform
    existing = (await db.execute(
        select(User).where(User.email == payload.email)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists"
        )

    role = _role_from_string(payload.role)

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        mobile=payload.mobile,
        phone=payload.phone,
        role=role,
        subscriber_id=subscriber_id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {
        "message": "User created successfully",
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": payload.role,   # return the friendly label
    }


@sub_router.delete("/{subscriber_id}/users/{user_id}")
async def remove_user_from_subscriber(
    subscriber_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Soft-delete (deactivate) a user from a subscriber.
    Preserves audit trail — user record stays in DB with is_active=False.

    Who can call this:
      - Super admin  → any subscriber
      - Main admin   → only standard_users in their own subscriber
                       (cannot remove another main_admin)
    """
    _require_main_admin_or_above(current_user)

    user = (await db.execute(
        select(User).where(
            and_(User.id == user_id, User.subscriber_id == subscriber_id)
        )
    )).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found in this subscriber")

    # Main admins cannot remove other main admins
    if current_user.role == UserRole.ADMIN and user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Main admins cannot remove other main admins"
        )

    user.is_active = False
    await db.commit()

    return {"message": f"{user.full_name} has been deactivated"}


@sub_router.patch("/{subscriber_id}/users/{user_id}/toggle-active")
async def toggle_subscriber_user_active(
    subscriber_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Re-activate or deactivate a user within a subscriber."""
    _require_main_admin_or_above(current_user)

    if (current_user.role == UserRole.ADMIN
            and str(current_user.subscriber_id) != str(subscriber_id)):
        raise HTTPException(status_code=403, detail="Access denied")

    user = (await db.execute(
        select(User).where(
            and_(User.id == user_id, User.subscriber_id == subscriber_id)
        )
    )).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.role == UserRole.ADMIN and user.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Cannot toggle another main admin")

    user.is_active = not user.is_active
    await db.commit()

    return {
        "is_active": user.is_active,
        "message": f"User {'activated' if user.is_active else 'deactivated'}"
    }


# ════════════════════════════════════════════════════════════════════════════════
# SUBSCRIBER SEARCHES  GET /subscribers/{id}/searches
# Returns individual searches for a subscriber with optional month/user filters
# ════════════════════════════════════════════════════════════════════════════════

@sub_router.get("/{subscriber_id}/searches")
async def get_subscriber_searches(
    subscriber_id: str,
    month: Optional[int] = Query(None, ge=1, le=12, description="Filter by month (1-12)"),
    year: Optional[int] = Query(None, ge=2020, description="Filter by year"),
    user_id: Optional[str] = Query(None, description="Filter by admin user who performed the search"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return all individual searches for a subscriber, with optional filters.
    Includes: searched person details, admin who searched, search metadata.
    Also returns per-admin summary and total cost.
    """
    # Access control
    if (current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]
            and str(current_user.subscriber_id) != str(subscriber_id)):
        raise HTTPException(status_code=403, detail="Access denied")

    # Verify subscriber exists
    sub = (await db.execute(
        select(Subscriber).where(Subscriber.id == subscriber_id)
    )).scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    # Build query — join Individual and User (who performed search)
    query = (
        select(IndividualSearch, Individual, User)
        .join(Individual, IndividualSearch.individual_id == Individual.id, isouter=True)
        .join(User, IndividualSearch.created_by_user_id == User.id, isouter=True)
        .where(IndividualSearch.subscriber_id == subscriber_id)
    )

    # Default to current month/year if neither provided
    now = datetime.utcnow()
    filter_year = year or now.year
    filter_month = month or now.month

    query = query.where(
        and_(
            extract("year",  IndividualSearch.created_at) == filter_year,
            extract("month", IndividualSearch.created_at) == filter_month,
        )
    )

    if user_id:
        query = query.where(IndividualSearch.created_by_user_id == user_id)

    query = query.order_by(IndividualSearch.created_at.desc()).offset(skip).limit(limit)
    rows = (await db.execute(query)).all()

    # Build search list
    searches = []
    admin_counts: dict = {}   # user_id -> {name, email, count}

    for search, individual, admin_user in rows:
        ind_name = individual.full_name if individual else None
        ind_id   = (individual.national_id or individual.passport_number) if individual else None
        ind_dob  = individual.date_of_birth.strftime("%d %b %Y") if individual and individual.date_of_birth else None

        admin_name  = admin_user.full_name if admin_user else "Unknown"
        admin_email = admin_user.email if admin_user else None
        admin_uid   = search.created_by_user_id

        searches.append({
            "id":              search.id,
            "search_ref":      search.search_ref,
            "search_purpose":  search.search_purpose.value if search.search_purpose else None,
            "status":          search.status.value if search.status else None,
            "credit_score":    search.credit_score,
            "created_at":      search.created_at.isoformat() if search.created_at else None,
            # Individual info
            "individual_name": ind_name,
            "individual_id":   ind_id,
            "individual_dob":  ind_dob,
            # Admin who searched
            "searched_by_id":    admin_uid,
            "searched_by_name":  admin_name,
            "searched_by_email": admin_email,
        })

        if admin_uid not in admin_counts:
            admin_counts[admin_uid] = {"name": admin_name, "email": admin_email, "count": 0}
        admin_counts[admin_uid]["count"] += 1

    total_searches = len(searches)
    total_cost = round(total_searches * COST_PER_SEARCH, 2)

    # Admin summary list
    admin_summary = [
        {"user_id": uid, "name": info["name"], "email": info["email"], "search_count": info["count"],
         "cost": round(info["count"] * COST_PER_SEARCH, 2)}
        for uid, info in sorted(admin_counts.items(), key=lambda x: -x[1]["count"])
    ]

    return {
        "subscriber_id":   subscriber_id,
        "filter_month":    filter_month,
        "filter_year":     filter_year,
        "total_searches":  total_searches,
        "total_cost":      total_cost,
        "cost_per_search": COST_PER_SEARCH,
        "searches":        searches,
        "admin_summary":   admin_summary,
    }


# ════════════════════════════════════════════════════════════════════════════════
# MODEL FIELDS TO ADD TO Subscriber  (if not already present)
# Run:  alembic revision --autogenerate -m "extend subscriber fields"
#       alembic upgrade head
# ════════════════════════════════════════════════════════════════════════════════
#
# registration_number   = Column(String, nullable=True)
# industry              = Column(String, nullable=True)
# physical_address      = Column(String, nullable=True)
# postal_address        = Column(String, nullable=True)
# contact_email         = Column(String, nullable=True)   # rename from 'email' if needed
# contact_phone         = Column(String, nullable=True)
# contact_phone2        = Column(String, nullable=True)
# website               = Column(String, nullable=True)
# contact_person_name   = Column(String, nullable=True)
# contact_person_title  = Column(String, nullable=True)
# contact_person_phone  = Column(String, nullable=True)
# contact_person_email  = Column(String, nullable=True)
# license_number        = Column(String, nullable=True)
# regulator             = Column(String, nullable=True)
# license_expiry        = Column(Date, nullable=True)
# updated_at            = Column(DateTime, onupdate=func.now(), nullable=True)
#
# ── UserRole enum — add STANDARD_USER ───────────────────────────────────────
# class UserRole(str, enum.Enum):
#     SUPER_ADMIN   = "super_admin"
#     ADMIN         = "admin"          # Main Admin
#     STANDARD_USER = "standard_user"  # Standard User  ← ADD THIS
#
# ── Register both routers in main.py ────────────────────────────────────────
# from app.api.v1.endpoints.users import router as users_router, sub_router as subscribers_router
# app.include_router(users_router,       prefix="/api/v1")
# app.include_router(subscribers_router, prefix="/api/v1")
#
# ── Update subscribersAPI.js ─────────────────────────────────────────────────
# addAdmin:    (subId, data) => api.post(`/subscribers/${subId}/users`, data)
# removeAdmin: (subId, uid)  => api.delete(`/subscribers/${subId}/users/${uid}`)
# toggleUser:  (subId, uid)  => api.patch(`/subscribers/${subId}/users/${uid}/toggle-active`)