from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.infrastructure.database.models import (
    CustomerModel,
    ExpenseModel,
    InvoiceModel,
    PaymentModel,
)
from app.infrastructure.database.session import get_db
from app.presentation.dependencies.auth import Tenant, get_tenant

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary")
def report_summary(
    start: date | None = None,
    end: date | None = None,
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    end = end or date.today()
    start = start or end - timedelta(days=30)
    revenue = db.scalar(
        select(func.coalesce(func.sum(PaymentModel.amount), 0)).where(
            PaymentModel.organization_id == tenant.organization_id,
            PaymentModel.payment_date.between(start, end),
        )
    ) or Decimal("0")
    expenses = db.scalar(
        select(func.coalesce(func.sum(ExpenseModel.amount), 0)).where(
            ExpenseModel.organization_id == tenant.organization_id,
            ExpenseModel.expense_date.between(start, end),
        )
    ) or Decimal("0")
    statuses = db.execute(
        select(InvoiceModel.status, func.count(InvoiceModel.id))
        .where(InvoiceModel.organization_id == tenant.organization_id)
        .group_by(InvoiceModel.status)
    ).all()
    customers = db.execute(
        select(CustomerModel.name, func.coalesce(func.sum(PaymentModel.amount), 0))
        .join(InvoiceModel, InvoiceModel.customer_id == CustomerModel.id)
        .join(PaymentModel, PaymentModel.invoice_id == InvoiceModel.id)
        .where(
            CustomerModel.organization_id == tenant.organization_id,
            PaymentModel.payment_date.between(start, end),
        )
        .group_by(CustomerModel.name)
        .order_by(func.sum(PaymentModel.amount).desc())
        .limit(10)
    ).all()
    return {
        "period_start": start,
        "period_end": end,
        "revenue": revenue,
        "expenses": expenses,
        "profit": revenue - expenses,
        "invoice_status": [{"status": status, "count": count} for status, count in statuses],
        "customer_revenue": [{"customer": name, "revenue": revenue} for name, revenue in customers],
    }
