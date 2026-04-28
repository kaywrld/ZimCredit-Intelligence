from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime

from app.db.database import get_db
from app.models.models import (
    User, Individual, IndividualSearch, IndividualAddress,
    IndividualEmployment, UserRole, SearchStatus
)
from app.schemas.searches import (
    IndividualSearchCreate, IndividualSearchResponse,
    IndividualSearchListResponse, SearchStatusUpdate, ConfirmationSubmit
)
from app.services.auth_service import get_current_user, get_admin_user
from app.utils.helpers import (
    generate_search_ref, calculate_individual_credit_score, get_score_band
)

router = APIRouter(prefix="/searches/individuals", tags=["Individual Searches"])


@router.post("/", response_model=IndividualSearchResponse, status_code=201)
async def create_individual_search(
    data: IndividualSearchCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new individual credit search (subscriber action)"""

    if not current_user.subscriber_id:
        raise HTTPException(status_code=400, detail="User is not linked to a subscriber")

    # Check if individual exists (match on national_id or passport)
    individual = None
    if data.national_id:
        result = await db.execute(
            select(Individual).where(Individual.national_id == data.national_id.upper())
        )
        individual = result.scalar_one_or_none()

    if not individual and data.passport_number:
        result = await db.execute(
            select(Individual).where(Individual.passport_number == data.passport_number)
        )
        individual = result.scalar_one_or_none()

    # Create individual if not found
    if not individual:
        individual = Individual(
            first_name=data.first_name,
            middle_name=data.middle_name,
            last_name=data.last_name,
            nationality=data.nationality,
            national_id=data.national_id.upper() if data.national_id else None,
            passport_number=data.passport_number,
            drivers_licence=data.drivers_licence,
            gender=data.gender,
            date_of_birth=data.date_of_birth,
            marital_status=data.marital_status,
            is_foreigner=data.is_foreigner,
        )
        db.add(individual)
        await db.flush()

    # Add address
    address = IndividualAddress(
        individual_id=individual.id,
        **data.address.model_dump()
    )
    db.add(address)

    # Add employment if provided
    if data.employer or data.occupation:
        employment = IndividualEmployment(
            individual_id=individual.id,
            employer=data.employer,
            occupation=data.occupation,
            industry=data.industry,
            salary_band_usd=data.salary_band_usd,
        )
        db.add(employment)

    # Calculate credit score from existing loan history
    credit_score = await calculate_individual_credit_score(db, individual.id)
    individual.credit_score = credit_score
    individual.credit_score_updated_at = datetime.utcnow()

    # Generate search reference
    search_ref = await generate_search_ref(db, "IND")

    # Determine initial status based on score
    initial_status = SearchStatus.OPEN

    search = IndividualSearch(
        search_ref=search_ref,
        subscriber_id=current_user.subscriber_id,
        created_by_user_id=current_user.id,
        individual_id=individual.id,
        search_purpose=data.search_purpose,
        status=initial_status,
        credit_score=credit_score,
        loan_purpose=data.loan_purpose,
        loan_amount=data.loan_amount,
    )
    db.add(search)
    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(IndividualSearch)
        .options(
            selectinload(IndividualSearch.individual).selectinload(Individual.addresses),
            selectinload(IndividualSearch.individual).selectinload(Individual.employment),
        )
        .where(IndividualSearch.id == search.id)
    )
    return result.scalar_one()


@router.get("/", response_model=List[IndividualSearchListResponse])
async def list_individual_searches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[SearchStatus] = None,
    search_term: Optional[str] = None,
):
    """List all individual searches for the current subscriber"""

    query = select(IndividualSearch).options(
        selectinload(IndividualSearch.individual)
    )

    # Subscribers only see their own searches
    if current_user.role in [UserRole.SUBSCRIBER, UserRole.READ_ONLY]:
        query = query.where(IndividualSearch.subscriber_id == current_user.subscriber_id)

    if status:
        query = query.where(IndividualSearch.status == status)

    query = query.order_by(IndividualSearch.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    searches = result.scalars().all()

    # Build list response
    response = []
    for s in searches:
        ind = s.individual
        response.append(IndividualSearchListResponse(
            id=s.id,
            search_ref=s.search_ref,
            search_purpose=s.search_purpose,
            status=s.status,
            credit_score=s.credit_score,
            created_at=s.created_at,
            individual_name=ind.full_name if ind else None,
            individual_id_number=ind.national_id or ind.passport_number if ind else None,
        ))
    return response


@router.get("/{search_id}", response_model=IndividualSearchResponse)
async def get_individual_search(
    search_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(IndividualSearch)
        .options(
            selectinload(IndividualSearch.individual).selectinload(Individual.addresses),
            selectinload(IndividualSearch.individual).selectinload(Individual.employment),
        )
        .where(IndividualSearch.id == search_id)
    )
    search = result.scalar_one_or_none()
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")

    # Access control - subscribers can only view their own
    if (current_user.role in [UserRole.SUBSCRIBER, UserRole.READ_ONLY]
            and search.subscriber_id != current_user.subscriber_id):
        raise HTTPException(status_code=403, detail="Access denied")

    return search


@router.post("/{search_id}/confirm")
async def submit_confirmation(
    search_id: str,
    data: ConfirmationSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Subscriber responds to a CONFIRMATION request from ZCI"""
    result = await db.execute(
        select(IndividualSearch).where(IndividualSearch.id == search_id)
    )
    search = result.scalar_one_or_none()
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")

    if search.subscriber_id != current_user.subscriber_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if search.status != SearchStatus.CONFIRMATION:
        raise HTTPException(status_code=400, detail="Search is not in CONFIRMATION status")

    search.confirmation_response = data.response
    search.status = SearchStatus.CONFIRMED
    await db.commit()
    return {"message": "Confirmation submitted. ZCI will process your response."}


# ── Admin endpoints ──────────────────────────────

@router.patch("/{search_id}/status")
async def update_search_status(
    search_id: str,
    data: SearchStatusUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """ZCI Admin updates the status of a search after processing"""
    result = await db.execute(
        select(IndividualSearch).where(IndividualSearch.id == search_id)
    )
    search = result.scalar_one_or_none()
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")

    search.status = data.status
    if data.credit_score is not None:
        search.credit_score = data.credit_score
    if data.rejection_reason:
        search.rejection_reason = data.rejection_reason
    if data.rejection_comments:
        search.rejection_comments = data.rejection_comments
    if data.confirmation_reason:
        search.confirmation_reason = data.confirmation_reason

    search.processed_by_id = admin.id
    search.processed_at = datetime.utcnow()

    await db.commit()
    return {"message": f"Search status updated to {data.status}"}


@router.get("/admin/all", response_model=List[IndividualSearchListResponse])
async def admin_list_all_searches(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
    status: Optional[SearchStatus] = None,
):
    """Admin view of all individual searches across all subscribers"""
    query = select(IndividualSearch).options(selectinload(IndividualSearch.individual))

    if status:
        query = query.where(IndividualSearch.status == status)

    query = query.order_by(IndividualSearch.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    searches = result.scalars().all()

    response = []
    for s in searches:
        ind = s.individual
        response.append(IndividualSearchListResponse(
            id=s.id,
            search_ref=s.search_ref,
            search_purpose=s.search_purpose,
            status=s.status,
            credit_score=s.credit_score,
            created_at=s.created_at,
            individual_name=ind.full_name if ind else None,
            individual_id_number=ind.national_id or ind.passport_number if ind else None,
        ))
    return response
