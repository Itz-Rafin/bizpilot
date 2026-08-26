import re

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.infrastructure.database.models import (
    OrganizationMemberModel,
    OrganizationModel,
    ProfileModel,
)
from app.infrastructure.database.session import get_db
from app.presentation.dependencies.auth import AuthenticatedUser, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class OnboardingRequest(BaseModel):
    business_name: str = Field(min_length=1, max_length=160)
    business_type: str = Field(min_length=1, max_length=80)
    currency: str = Field(min_length=3, max_length=3)
    timezone: str = Field(min_length=1, max_length=64)


@router.post("/bootstrap", status_code=status.HTTP_201_CREATED)
def bootstrap_account(
    payload: OnboardingRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.get(ProfileModel, user.user_id)
    if profile is None:
        profile = ProfileModel(id=user.user_id, full_name=None)
        db.add(profile)
    existing_memberships = (
        db.query(OrganizationMemberModel)
        .filter_by(user_id=user.user_id)
        .order_by(OrganizationMemberModel.created_at)
        .limit(20)
        .all()
    )
    if existing_memberships:
        active_membership = next(
            (
                item
                for item in existing_memberships
                if profile.active_organization_id == item.organization_id
            ),
            None,
        )
        if active_membership is None and len(existing_memberships) == 1:
            active_membership = existing_memberships[0]
            profile.active_organization_id = active_membership.organization_id
            db.commit()
        selected_membership = active_membership or existing_memberships[0]
        return {"organization_id": str(selected_membership.organization_id), "created": False}
    slug_base = re.sub(r"[^a-z0-9]+", "-", payload.business_name.lower()).strip("-") or "workspace"
    organization = OrganizationModel(
        name=payload.business_name,
        slug=f"{slug_base}-{str(user.user_id)[:8]}",
        business_type=payload.business_type,
        currency=payload.currency.upper(),
        timezone=payload.timezone,
    )
    db.add(organization)
    db.flush()
    db.add(
        OrganizationMemberModel(organization_id=organization.id, user_id=user.user_id, role="owner")
    )
    profile.active_organization_id = organization.id
    db.commit()
    return {"organization_id": str(organization.id), "created": True}
