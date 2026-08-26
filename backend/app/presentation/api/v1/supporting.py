from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.database.models import (
    ActivityLogModel,
    NotificationModel,
    OrganizationMemberModel,
    OrganizationModel,
)
from app.infrastructure.database.session import get_db
from app.presentation.dependencies.auth import Tenant, get_tenant, require_roles
from app.presentation.schemas.api import ActivityRead, NotificationRead

router = APIRouter(tags=["supporting systems"])


@router.get("/notifications", response_model=list[NotificationRead])
def list_notifications(tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return db.scalars(
        select(NotificationModel)
        .where(
            NotificationModel.organization_id == tenant.organization_id,
            (NotificationModel.user_id.is_(None)) | (NotificationModel.user_id == tenant.user_id),
        )
        .order_by(NotificationModel.created_at.desc())
        .limit(100)
    ).all()


@router.post("/notifications/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read(
    notification_id: UUID, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)
):
    item = db.scalar(
        select(NotificationModel).where(
            NotificationModel.id == notification_id,
            NotificationModel.organization_id == tenant.organization_id,
        )
    )
    if item is None:
        raise HTTPException(404, "Notification not found")
    item.read = True
    db.commit()
    db.refresh(item)
    return item


@router.get("/activity", response_model=list[ActivityRead])
def list_activity(tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return db.scalars(
        select(ActivityLogModel)
        .where(ActivityLogModel.organization_id == tenant.organization_id)
        .order_by(ActivityLogModel.created_at.desc())
        .limit(100)
    ).all()


class OrganizationUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    business_type: str | None = None
    currency: str = Field(min_length=3, max_length=3)
    timezone: str = Field(min_length=1, max_length=64)


@router.get("/settings/organization")
def get_organization_settings(tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    item = db.get(OrganizationModel, tenant.organization_id)
    if item is None:
        raise HTTPException(404, "Organization not found")
    return item


@router.patch("/settings/organization")
def update_organization_settings(
    payload: OrganizationUpdate,
    tenant: Tenant = Depends(require_roles("owner", "admin")),
    db: Session = Depends(get_db),
):
    item = db.get(OrganizationModel, tenant.organization_id)
    if item is None:
        raise HTTPException(404, "Organization not found")
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.get("/team")
def list_team(tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return (
        db.execute(
            select(OrganizationMemberModel)
            .where(OrganizationMemberModel.organization_id == tenant.organization_id)
            .limit(100)
        )
        .mappings()
        .all()
    )
