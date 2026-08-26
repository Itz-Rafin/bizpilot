from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.use_cases.operations import ExpenseUseCases
from app.domain.ports.repositories import TenantContext
from app.infrastructure.database.operations_repositories import SqlAlchemyExpenseRepository
from app.infrastructure.database.repositories import SqlAlchemyDashboardRepository
from app.infrastructure.database.session import get_db
from app.presentation.dependencies.auth import Tenant, get_tenant
from app.presentation.schemas.api import DashboardMetrics, ExpenseCreate, ExpenseRead

expenses_router = APIRouter(prefix="/expenses", tags=["expenses"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def cases(db: Session = Depends(get_db)) -> ExpenseUseCases:
    return ExpenseUseCases(SqlAlchemyExpenseRepository(db))


def tenant_context(tenant: Tenant) -> TenantContext:
    return TenantContext(
        user_id=tenant.user_id, organization_id=tenant.organization_id, role=tenant.role
    )


@expenses_router.get("", response_model=list[ExpenseRead])
def list_expenses(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    tenant: Tenant = Depends(get_tenant),
    use_cases: ExpenseUseCases = Depends(cases),
):
    return use_cases.list(tenant_context(tenant), offset, limit)


@expenses_router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    tenant: Tenant = Depends(get_tenant),
    use_cases: ExpenseUseCases = Depends(cases),
):
    try:
        return use_cases.create(tenant_context(tenant), payload.model_dump())
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@expenses_router.patch("/{expense_id}", response_model=ExpenseRead)
def update_expense(
    expense_id: UUID,
    payload: ExpenseCreate,
    tenant: Tenant = Depends(get_tenant),
    use_cases: ExpenseUseCases = Depends(cases),
):
    item = use_cases.update(tenant_context(tenant), expense_id, payload.model_dump())
    if item is None:
        raise HTTPException(404, "Expense not found")
    return item


@expenses_router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: UUID,
    tenant: Tenant = Depends(get_tenant),
    use_cases: ExpenseUseCases = Depends(cases),
):
    if not use_cases.delete(tenant_context(tenant), expense_id):
        raise HTTPException(404, "Expense not found")


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
