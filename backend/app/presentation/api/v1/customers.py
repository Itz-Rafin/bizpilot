from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.use_cases.customers import CustomerUseCases
from app.domain.ports.repositories import TenantContext
from app.infrastructure.database.repositories import SqlAlchemyCustomerRepository
from app.infrastructure.database.session import get_db
from app.presentation.dependencies.auth import Tenant, get_tenant
from app.presentation.schemas.api import CustomerCreate, CustomerRead, CustomerUpdate

router = APIRouter(prefix="/customers", tags=["customers"])


def use_cases(db: Session = Depends(get_db)) -> CustomerUseCases:
    return CustomerUseCases(SqlAlchemyCustomerRepository(db))


def tenant_context(tenant: Tenant) -> TenantContext:
    return TenantContext(
        user_id=tenant.user_id, organization_id=tenant.organization_id, role=tenant.role
    )


@router.get("", response_model=list[CustomerRead])
def list_customers(
    search: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    tenant: Tenant = Depends(get_tenant),
    cases: CustomerUseCases = Depends(use_cases),
):
    return cases.list(tenant_context(tenant), search, offset, limit)


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    tenant: Tenant = Depends(get_tenant),
    cases: CustomerUseCases = Depends(use_cases),
):
    return cases.create(tenant_context(tenant), payload.model_dump())


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(
    customer_id: UUID,
    tenant: Tenant = Depends(get_tenant),
    cases: CustomerUseCases = Depends(use_cases),
):
    item = cases.get(tenant_context(tenant), customer_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return item


@router.patch("/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: UUID,
    payload: CustomerUpdate,
    tenant: Tenant = Depends(get_tenant),
    cases: CustomerUseCases = Depends(use_cases),
):
    item = cases.update(tenant_context(tenant), customer_id, payload.model_dump(exclude_unset=True))
    if item is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return item


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_customer(
    customer_id: UUID,
    tenant: Tenant = Depends(get_tenant),
    cases: CustomerUseCases = Depends(use_cases),
):
    if not cases.archive(tenant_context(tenant), customer_id):
        raise HTTPException(status_code=404, detail="Customer not found")
