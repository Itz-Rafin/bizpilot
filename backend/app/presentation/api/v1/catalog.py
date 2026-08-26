from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.database.models import ProductModel, ServiceModel
from app.infrastructure.database.session import get_db
from app.presentation.dependencies.auth import Tenant, get_tenant
from app.presentation.schemas.api import ProductCreate, ProductRead, ServiceCreate, ServiceRead

products_router = APIRouter(prefix="/products", tags=["products"])
services_router = APIRouter(prefix="/services", tags=["services"])


@products_router.get("", response_model=list[ProductRead])
def list_products(
    search: str | None = None, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)
):
    query = select(ProductModel).where(
        ProductModel.organization_id == tenant.organization_id, ProductModel.status == "active"
    )
    if search:
        query = query.where(ProductModel.name.ilike(f"%{search.strip()}%"))
    return db.scalars(query.order_by(ProductModel.name).limit(100)).all()


@products_router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)
):
    item = ProductModel(organization_id=tenant.organization_id, **payload.model_dump())
    db.add(item)
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
    search: str | None = None, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)
):
    query = select(ServiceModel).where(
        ServiceModel.organization_id == tenant.organization_id, ServiceModel.status == "active"
    )
    if search:
        query = query.where(ServiceModel.name.ilike(f"%{search.strip()}%"))
    return db.scalars(query.order_by(ServiceModel.name).limit(100)).all()


@services_router.post("", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
def create_service(
    payload: ServiceCreate, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)
):
    item = ServiceModel(organization_id=tenant.organization_id, **payload.model_dump())
    db.add(item)
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
