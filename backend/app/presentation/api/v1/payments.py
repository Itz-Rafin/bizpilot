from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.use_cases.billing import BillingUseCases
from app.domain.entities.billing import Payment, PaymentMethod
from app.infrastructure.database.repositories import (
    SqlAlchemyInvoiceRepository,
    SqlAlchemyPaymentRepository,
)
from app.infrastructure.database.session import get_db
from app.presentation.dependencies.auth import Tenant, get_tenant
from app.presentation.schemas.api import PaymentCreate, PaymentRead

router = APIRouter(prefix="/payments", tags=["payments"])


def use_cases(db: Session = Depends(get_db)) -> BillingUseCases:
    return BillingUseCases(SqlAlchemyInvoiceRepository(db), SqlAlchemyPaymentRepository(db))


@router.get("", response_model=list[PaymentRead])
def list_payments(tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return (
        db.query(
            __import__("app.infrastructure.database.models", fromlist=["PaymentModel"]).PaymentModel
        )
        .filter_by(organization_id=tenant.organization_id)
        .order_by(
            __import__(
                "app.infrastructure.database.models", fromlist=["PaymentModel"]
            ).PaymentModel.payment_date.desc()
        )
        .limit(100)
        .all()
    )


@router.post("", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
def record_payment(
    payload: PaymentCreate,
    tenant: Tenant = Depends(get_tenant),
    cases: BillingUseCases = Depends(use_cases),
):
    payment = Payment(
        invoice_id=str(payload.invoice_id),
        organization_id=str(tenant.organization_id),
        amount=payload.amount,
        payment_method=PaymentMethod(payload.payment_method),
        payment_date=payload.payment_date,
        reference=payload.reference,
        notes=payload.notes,
    )
    try:
        return cases.record_payment(tenant, payment)
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
