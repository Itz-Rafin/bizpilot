from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.use_cases.operations import CatalogUseCases
from app.domain.ports.repositories import TenantContext
from app.infrastructure.database.models import ProductModel, ServiceModel
from app.infrastructure.database.operations_repositories import SqlAlchemyCatalogRepository
from app.infrastructure.database.session import get_db
from app.presentation.dependencies.auth import Tenant, get_tenant
from app.presentation.schemas.api import ProductCreate, ProductRead, ServiceCreate, ServiceRead

products_router = APIRouter(prefix="/products", tags=["products"])
services_router = APIRouter(prefix="/services", tags=["services"])


def cases(db: Session = Depends(get_db)) -> CatalogUseCases:
    return CatalogUseCases(SqlAlchemyCatalogRepository(db))


def tenant_context(tenant: Tenant) -> TenantContext:
    return TenantContext(
        user_id=tenant.user_id, organization_id=tenant.organization_id, role=tenant.role
    )


@products_router.get("", response_model=list[ProductRead])
def list_products(
    search: str | None = None,
    tenant: Tenant = Depends(get_tenant),
    use_cases: CatalogUseCases = Depends(cases),
):
    return use_cases.list_products(tenant_context(tenant), search)


@products_router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    tenant: Tenant = Depends(get_tenant),
    use_cases: CatalogUseCases = Depends(cases),
):
    return use_cases.create_product(tenant_context(tenant), payload.model_dump())


@products_router.patch("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: UUID,
    payload: ProductCreate,
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(ProductModel).where(
            ProductModel.id == product_id, ProductModel.organization_id == tenant.organization_id
        )
    )
    if item is None:
        raise HTTPException(404, "Product not found")
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@products_router.post("/{product_id}/archive", response_model=ProductRead)
def archive_product(
    product_id: UUID, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)
):
    item = db.scalar(
        select(ProductModel).where(
            ProductModel.id == product_id, ProductModel.organization_id == tenant.organization_id
        )
    )
    if item is None:
        raise HTTPException(404, "Product not found")
    item.status = "archived"
    db.commit()
    db.refresh(item)
    return item


@services_router.get("", response_model=list[ServiceRead])
def list_services(
    search: str | None = None,
    tenant: Tenant = Depends(get_tenant),
    use_cases: CatalogUseCases = Depends(cases),
):
    return use_cases.list_services(tenant_context(tenant), search)


@services_router.post("", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
def create_service(
    payload: ServiceCreate,
    tenant: Tenant = Depends(get_tenant),
    use_cases: CatalogUseCases = Depends(cases),
):
    return use_cases.create_service(tenant_context(tenant), payload.model_dump())


@services_router.patch("/{service_id}", response_model=ServiceRead)
def update_service(
    service_id: UUID,
    payload: ServiceCreate,
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(ServiceModel).where(
            ServiceModel.id == service_id, ServiceModel.organization_id == tenant.organization_id
        )
    )
    if item is None:
        raise HTTPException(404, "Service not found")
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@services_router.post("/{service_id}/archive", response_model=ServiceRead)
def archive_service(
    service_id: UUID, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)
):
    item = db.scalar(
        select(ServiceModel).where(
            ServiceModel.id == service_id, ServiceModel.organization_id == tenant.organization_id
        )
    )
    if item is None:
        raise HTTPException(404, "Service not found")
    item.status = "archived"
    db.commit()
    db.refresh(item)
    return item
