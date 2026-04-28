from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime

from app.db.database import get_db
from app.models.models import (
    User, Subscriber, IndividualSearch, CompanySearch,
    UserRole, SubscriberStatus
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

COST_PER_SEARCH = 0.05  # $0.05 per search


@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    is_super_admin = current_user.role == UserRole.SUPER_ADMIN
    today = datetime.utcnow().date()

    # Current month range
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ── SUPER ADMIN: Subscriber-level overview ──────────────────────────────
    if is_super_admin:
        # Total ACTIVE subscribers (companies created by super admin — not the super admin themselves)
        total_subs_result = await db.execute(
            select(func.count(Subscriber.id)).where(
                Subscriber.status == SubscriberStatus.ACTIVE
            )
        )
        total_subscribers = total_subs_result.scalar_one()

        # Pending subscribers
        pending_result = await db.execute(
            select(func.count(Subscriber.id)).where(
                Subscriber.status == SubscriberStatus.PENDING
            )
        )
        total_pending = pending_result.scalar_one()

        # Total searches THIS MONTH across all subscribers (excludes super admin)
        total_ind_month = (await db.execute(
            select(func.count(IndividualSearch.id)).where(
                IndividualSearch.created_at >= month_start
            )
        )).scalar_one()

        total_com_month = (await db.execute(
            select(func.count(CompanySearch.id)).where(
                CompanySearch.created_at >= month_start
            )
        )).scalar_one()

        total_searches = total_ind_month + total_com_month
        total_revenue = round(total_searches * COST_PER_SEARCH, 2)

        # Per-subscriber breakdown
        subs_result = await db.execute(
            select(Subscriber).order_by(Subscriber.created_at.desc())
        )
        subscribers = subs_result.scalars().all()

        subscriber_rows = []
        for sub in subscribers:
            # Count active admins/users for this subscriber
            user_count_result = await db.execute(
                select(func.count(User.id)).where(
                    and_(
                        User.subscriber_id == sub.id,
                        User.is_active == True
                    )
                )
            )
            user_count = user_count_result.scalar_one()

            # Count individual searches for this subscriber (all time — for billing)
            ind_result = await db.execute(
                select(func.count(IndividualSearch.id)).where(
                    IndividualSearch.subscriber_id == sub.id
                )
            )
            ind_count = ind_result.scalar_one()

            # Count company searches for this subscriber (all time — for billing)
            com_result = await db.execute(
                select(func.count(CompanySearch.id)).where(
                    CompanySearch.subscriber_id == sub.id
                )
            )
            com_count = com_result.scalar_one()

            total = ind_count + com_count
            amount_owed = round(total * COST_PER_SEARCH, 2)

            subscriber_rows.append({
                "id": sub.id,
                "name": sub.name,
                "industry": sub.industry or "—",
                "status": sub.status,
                "user_count": user_count,
                "individual_searches": ind_count,
                "company_searches": com_count,
                "total_searches": total,
                "amount_owed": amount_owed,
                "joined": sub.created_at.isoformat() if sub.created_at else None,
            })

        return {
            "role": "super_admin",
            # Cards
            "total_subscribers": total_subscribers,
            "total_pending": total_pending,
            "total_searches": total_searches,         # This month
            "total_individual_searches": total_ind_month,
            "total_company_searches": total_com_month,
            "total_revenue": total_revenue,            # This month
            "cost_per_search": COST_PER_SEARCH,
            # Table
            "subscribers": subscriber_rows,
        }

    # ── ADMIN / USER: Own subscriber stats ─────────────────────────────────
    sub_id = current_user.subscriber_id

    ind_result = await db.execute(
        select(func.count(IndividualSearch.id)).where(
            IndividualSearch.subscriber_id == sub_id
        )
    )
    total_individual = ind_result.scalar_one()

    com_result = await db.execute(
        select(func.count(CompanySearch.id)).where(
            CompanySearch.subscriber_id == sub_id
        )
    )
    total_company = com_result.scalar_one()

    # Today
    today_ind = (await db.execute(
        select(func.count(IndividualSearch.id)).where(
            and_(
                IndividualSearch.subscriber_id == sub_id,
                func.date(IndividualSearch.created_at) == today
            )
        )
    )).scalar_one()

    today_com = (await db.execute(
        select(func.count(CompanySearch.id)).where(
            and_(
                CompanySearch.subscriber_id == sub_id,
                func.date(CompanySearch.created_at) == today
            )
        )
    )).scalar_one()

    total_searches = total_individual + total_company
    amount_owed = round(total_searches * COST_PER_SEARCH, 2)

    # Recent individual searches
    recent_ind = (await db.execute(
        select(IndividualSearch).where(
            IndividualSearch.subscriber_id == sub_id
        ).order_by(IndividualSearch.created_at.desc()).limit(5)
    )).scalars().all()

    # Recent company searches
    recent_com = (await db.execute(
        select(CompanySearch).where(
            CompanySearch.subscriber_id == sub_id
        ).order_by(CompanySearch.created_at.desc()).limit(5)
    )).scalars().all()

    return {
        "role": current_user.role,
        "total_individual_searches": total_individual,
        "total_company_searches": total_company,
        "daily_individual_searches": today_ind,
        "daily_company_searches": today_com,
        "total_searches": total_searches,
        "amount_owed": amount_owed,
        "cost_per_search": COST_PER_SEARCH,
        "recent_individual_searches": [
            {
                "id": s.id,
                "search_ref": s.search_ref,
                "status": s.status,
                "credit_score": s.credit_score,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in recent_ind
        ],
        "recent_company_searches": [
            {
                "id": s.id,
                "search_ref": s.search_ref,
                "status": s.status,
                "credit_score": s.credit_score,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in recent_com
        ],
    }