from __future__ import annotations

import json
from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.infrastructure.auth.jwt_verifier import SupabaseJwtVerifier
from app.infrastructure.database.models import OrganizationMemberModel, ProfileModel
from app.infrastructure.database.session import get_db

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True, slots=True)
class AuthenticatedUser:
    user_id: UUID
    email: str | None


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> AuthenticatedUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )
    try:
        verified = SupabaseJwtVerifier(get_settings()).verify(credentials.credentials)
    except ValueError as exc:
        error_status = (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if "not configured" in str(exc)
            else status.HTTP_401_UNAUTHORIZED
        )
        raise HTTPException(status_code=error_status, detail=str(exc)) from exc
    return AuthenticatedUser(user_id=verified.user_id, email=verified.email)


@dataclass(frozen=True, slots=True)
class Tenant:
    user_id: UUID
    organization_id: UUID
    role: str


def _set_database_auth_context(db: Session, user: AuthenticatedUser) -> None:
    """Make the direct SQLAlchemy connection evaluate Supabase RLS as the user."""
    claims = {"sub": str(user.user_id), "role": "authenticated", "aud": "authenticated"}
    if user.email:
        claims["email"] = user.email
    db.execute(text("set local role authenticated"))
    db.execute(
        text("select set_config('request.jwt.claims', :claims, true)"),
        {"claims": json.dumps(claims)},
    )


def get_tenant(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Tenant:
    _set_database_auth_context(db, user)
    profile = db.get(ProfileModel, user.user_id)
    active_id = profile.active_organization_id if profile else None

    if active_id is not None:
        membership = db.scalar(
            select(OrganizationMemberModel).where(
                OrganizationMemberModel.user_id == user.user_id,
                OrganizationMemberModel.organization_id == active_id,
            )
        )
        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Active organization access is no longer available",
            )
        return Tenant(
            user_id=user.user_id, organization_id=membership.organization_id, role=membership.role
        )

    memberships = db.scalars(
        select(OrganizationMemberModel)
        .where(OrganizationMemberModel.user_id == user.user_id)
        .order_by(OrganizationMemberModel.created_at)
        .limit(2)
    ).all()
    if not memberships:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="No organization membership found"
        )
    if len(memberships) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Active organization is not set; select one before continuing",
        )

    membership = memberships[0]
    if profile is not None:
        profile.active_organization_id = membership.organization_id
        db.flush()
    return Tenant(
        user_id=user.user_id, organization_id=membership.organization_id, role=membership.role
    )


def require_roles(*roles: str):
    def dependency(tenant: Tenant = Depends(get_tenant)) -> Tenant:
        if tenant.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
            )
        return tenant

    return dependency
