from dataclasses import dataclass
from uuid import UUID

from jose import JWTError, jwt

from app.core.config import Settings


@dataclass(frozen=True, slots=True)
class VerifiedToken:
    user_id: UUID
    email: str | None


class SupabaseJwtVerifier:
    def __init__(self, settings: Settings):
        self.settings = settings

    def verify(self, token: str) -> VerifiedToken:
        if not self.settings.supabase_jwt_secret:
            raise ValueError("Authentication is not configured")
        try:
            payload = jwt.decode(
                token,
                self.settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            return VerifiedToken(user_id=UUID(payload["sub"]), email=payload.get("email"))
        except (JWTError, KeyError, ValueError) as exc:
            raise ValueError("Invalid authentication token") from exc
