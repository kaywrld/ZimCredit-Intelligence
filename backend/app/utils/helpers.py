"""
Utility functions for ZimCredit Intelligence
- Search reference generation
- Credit score calculation
- Zimbabwe ID validation
"""
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.models import IndividualSearch, CompanySearch, LoanRecord, LoanStatus
import re


async def generate_search_ref(db: AsyncSession, search_type: str = "IND") -> str:
    """Generate sequential search reference: IND-202400001 or COM-202400001"""
    year = datetime.utcnow().year
    prefix = f"{search_type}-{year}"

    if search_type == "IND":
        result = await db.execute(
            select(func.count(IndividualSearch.id)).where(
                IndividualSearch.search_ref.like(f"{prefix}%")
            )
        )
    else:
        result = await db.execute(
            select(func.count(CompanySearch.id)).where(
                CompanySearch.search_ref.like(f"{prefix}%")
            )
        )

    count = result.scalar_one() + 1
    return f"{prefix}{str(count).zfill(5)}"


def validate_zimbabwean_id(id_number: str) -> bool:
    """
    Validate Zimbabwean National ID format
    Format: XX-XXXXXXX-X-XX (e.g. 63-1234567A-50)
    """
    if not id_number:
        return False
    pattern = r"^\d{2}-\d{6,7}[A-Z]-\d{2}$"
    return bool(re.match(pattern, id_number.upper()))


def validate_zim_company_reg(reg_number: str, before_2024: bool = True) -> bool:
    """
    Validate Zimbabwe company registration number
    Old format (before 2024): XXXXX/YYYY (e.g. 12345/2000)
    New format (2024+): minimum 5 digits before check letter
    """
    if not reg_number:
        return False
    if before_2024:
        pattern = r"^\d{4,6}/\d{4}$"
        return bool(re.match(pattern, reg_number))
    return len(reg_number) >= 5


async def calculate_individual_credit_score(
    db: AsyncSession,
    individual_id: str
) -> int:
    """
    Basic credit scoring algorithm for Phase 1.
    Score range: 0 - 999
    
    Factors:
    - Payment history (most important) - 40%
    - Outstanding debt level - 25%
    - Length of credit history - 20%
    - Number of defaults - 15%
    """
    result = await db.execute(
        select(LoanRecord).where(LoanRecord.individual_id == individual_id)
    )
    loans = result.scalars().all()

    if not loans:
        # No credit history - neutral score
        return 500

    base_score = 750  # Start high, deduct for negatives

    total_loans = len(loans)
    defaults = [l for l in loans if l.status in [LoanStatus.DEFAULT, LoanStatus.WRITTEN_OFF]]
    settled = [l for l in loans if l.status == LoanStatus.SETTLED]
    performing = [l for l in loans if l.status == LoanStatus.PERFORMING]

    # Deduct for defaults (heavy penalty)
    default_penalty = len(defaults) * 80
    base_score -= default_penalty

    # Deduct for days in arrears
    total_arrears_days = sum(l.days_in_arrears or 0 for l in loans)
    if total_arrears_days > 0:
        arrears_penalty = min(total_arrears_days * 2, 150)
        base_score -= arrears_penalty

    # Reward for settled loans (positive history)
    settled_bonus = len(settled) * 20
    base_score += min(settled_bonus, 100)

    # Reward for performing loans
    performing_bonus = len(performing) * 10
    base_score += min(performing_bonus, 50)

    # Total outstanding balance ratio penalty
    total_outstanding = sum(l.outstanding_balance or 0 for l in loans if l.outstanding_balance)
    total_borrowed = sum(l.loan_amount or 0 for l in loans if l.loan_amount)
    if total_borrowed > 0:
        utilisation = total_outstanding / total_borrowed
        if utilisation > 0.8:
            base_score -= 80
        elif utilisation > 0.5:
            base_score -= 40

    # Clamp score between 100 and 999
    return max(100, min(999, base_score))


def get_score_band(score: int) -> str:
    """Map numeric score to ZCI status band"""
    if score >= 700:
        return "GOOD"
    elif score >= 600:
        return "FAIR"
    elif score >= 400:
        return "INCONCLUSIVE"
    else:
        return "ADVERSE"
