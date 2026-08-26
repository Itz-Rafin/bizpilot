from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.infrastructure.auth.jwt_verifier import SupabaseJwtVerifier
from app.infrastructure.database.models import OrganizationMemberModel
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


def get_tenant(
    user: AuthenticatedUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> Tenant:
    membership = db.scalar(
        select(OrganizationMemberModel)
        .where(OrganizationMemberModel.user_id == user.user_id)
        .order_by(OrganizationMemberModel.created_at)
        .limit(1)
    )
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="No organization membership found"
        )
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
