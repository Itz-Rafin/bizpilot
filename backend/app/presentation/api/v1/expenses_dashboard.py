from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.database.models import ExpenseModel
from app.infrastructure.database.repositories import SqlAlchemyDashboardRepository
from app.infrastructure.database.session import get_db
from app.presentation.dependencies.auth import Tenant, get_tenant
from app.presentation.schemas.api import DashboardMetrics, ExpenseCreate, ExpenseRead

expenses_router = APIRouter(prefix="/expenses", tags=["expenses"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@expenses_router.get("", response_model=list[ExpenseRead])
def list_expenses(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(ExpenseModel)
        .where(ExpenseModel.organization_id == tenant.organization_id)
        .order_by(ExpenseModel.expense_date.desc())
        .offset(offset)
        .limit(limit)
    ).all()


@expenses_router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)
):
    item = ExpenseModel(organization_id=tenant.organization_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@dashboard_router.get("/metrics", response_model=DashboardMetrics)
def get_metrics(
    start: date | None = None,
    end: date | None = None,
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    end = end or date.today()
    start = start or (end - timedelta(days=30))
    metrics = SqlAlchemyDashboardRepository(db).metrics(tenant.organization_id, start, end)
    return DashboardMetrics(**metrics, period_start=start, period_end=end)
