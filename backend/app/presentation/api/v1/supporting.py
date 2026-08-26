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
    ProfileModel,
)
from app.infrastructure.database.session import get_db
from app.presentation.dependencies.auth import (
    AuthenticatedUser,
    Tenant,
    get_current_user,
    get_tenant,
    require_roles,
)
from app.presentation.schemas.api import (
    ActiveOrganizationRequest,
    ActiveOrganizationResponse,
    ActivityRead,
    NotificationRead,
    OrganizationContextRead,
    TeamMemberRead,
    WorkspaceContext,
)

router = APIRouter(tags=["supporting systems"])


@router.get("/me", response_model=WorkspaceContext)
def get_workspace_context(
    user: AuthenticatedUser = Depends(get_current_user), db: Session = Depends(get_db)
):
    profile = db.get(ProfileModel, user.user_id)
    memberships = db.scalars(
        select(OrganizationMemberModel)
        .where(OrganizationMemberModel.user_id == user.user_id)
        .limit(20)
    ).all()
    organizations = [
        db.get(OrganizationModel, membership.organization_id) for membership in memberships
    ]
    active_membership = next(
        (
            membership
            for membership in memberships
            if profile and membership.organization_id == profile.active_organization_id
        ),
        None,
    )
    active_organization = next(
        (
            organization
            for organization in organizations
            if active_membership
            and organization
            and organization.id == active_membership.organization_id
        ),
        None,
    )
    if active_organization is None and len(memberships) == 1:
        active_membership = memberships[0]
        active_organization = organizations[0]
        if profile is not None:
            profile.active_organization_id = active_membership.organization_id
            db.commit()
    return {
        "organization": active_organization,
        "profile": profile,
        "role": active_membership.role if active_membership else None,
        "active_organization_id": active_organization.id if active_organization else None,
        "organizations": [
            {"id": organization.id, "name": organization.name, "role": membership.role}
            for organization, membership in zip(organizations, memberships, strict=True)
            if organization
        ],
    }


@router.post("/organizations/active", response_model=ActiveOrganizationResponse)
def set_active_organization(
    payload: ActiveOrganizationRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = db.scalar(
        select(OrganizationMemberModel).where(
            OrganizationMemberModel.user_id == user.user_id,
            OrganizationMemberModel.organization_id == payload.organization_id,
        )
    )
    if membership is None:
        raise HTTPException(403, "Organization access denied")
    profile = db.get(ProfileModel, user.user_id)
    if profile is None:
        profile = ProfileModel(id=user.user_id)
        db.add(profile)
    profile.active_organization_id = payload.organization_id
    db.commit()
    return {"active_organization_id": str(payload.organization_id)}


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


@router.get("/settings/organization", response_model=OrganizationContextRead)
def get_organization_settings(tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    item = db.get(OrganizationModel, tenant.organization_id)
    if item is None:
        raise HTTPException(404, "Organization not found")
    return item


@router.patch("/settings/organization", response_model=OrganizationContextRead)
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


@router.get("/team", response_model=list[TeamMemberRead])
def list_team(tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return (
        db.execute(
            select(OrganizationMemberModel)
            .where(OrganizationMemberModel.organization_id == tenant.organization_id)
            .limit(100)
        )
        .scalars()
        .all()
    )
