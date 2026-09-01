from dataclasses import dataclass
from threading import Lock
from time import monotonic
from uuid import UUID

import httpx
from jose import JWTError, jwk, jwt

from app.core.config import Settings


@dataclass(frozen=True, slots=True)
class VerifiedToken:
    user_id: UUID
    email: str | None


class SupabaseJwtVerifier:
    _jwks_cache: dict[str, tuple[float, dict]] = {}
    _jwks_lock = Lock()
    _jwks_ttl_seconds = 600

    def __init__(self, settings: Settings):
        self.settings = settings

    @property
    def issuer(self) -> str:
        return f"{self.settings.supabase_url.rstrip('/')}/auth/v1"

    def _get_jwks(self) -> dict:
        cached = self._jwks_cache.get(self.issuer)
        if cached and monotonic() - cached[0] < self._jwks_ttl_seconds:
            return cached[1]

        with self._jwks_lock:
            cached = self._jwks_cache.get(self.issuer)
            if cached and monotonic() - cached[0] < self._jwks_ttl_seconds:
                return cached[1]
            response = httpx.get(
                f"{self.issuer}/.well-known/jwks.json",
                timeout=5,
                follow_redirects=True,
            )
            response.raise_for_status()
            value = response.json()
            if not isinstance(value, dict) or not isinstance(value.get("keys"), list):
                raise ValueError("Invalid Supabase JWKS response")
            self._jwks_cache[self.issuer] = (monotonic(), value)
            return value

    def _verify_asymmetric(self, token: str, algorithm: str, header: dict) -> dict:
        jwks = self._get_jwks()
        keys = [key for key in jwks["keys"] if key.get("alg") in (None, algorithm)]
        kid = header.get("kid")
        if kid:
            keys = [key for key in keys if key.get("kid") == kid]
        if not keys:
            raise ValueError("No matching Supabase signing key")
        key = jwk.construct(keys[0], algorithm=algorithm)
        return jwt.decode(
            token,
            key,
            algorithms=[algorithm],
            audience=self.settings.supabase_jwt_audience,
            issuer=self.issuer,
        )

    def verify(self, token: str) -> VerifiedToken:
        try:
            header = jwt.get_unverified_header(token)
            algorithm = header.get("alg")
            if algorithm in ("RS256", "ES256"):
                payload = self._verify_asymmetric(token, algorithm, header)
            elif algorithm == "HS256" and self.settings.supabase_jwt_secret:
                payload = jwt.decode(
                    token,
                    self.settings.supabase_jwt_secret,
                    algorithms=["HS256"],
                    audience=self.settings.supabase_jwt_audience,
                    issuer=self.issuer,
                )
            else:
                raise ValueError("Unsupported authentication algorithm")

            user_id = UUID(str(payload["sub"]))
            if payload.get("role") not in (None, "authenticated"):
                raise ValueError("Invalid authentication role")
            return VerifiedToken(user_id=user_id, email=payload.get("email"))
        except (JWTError, KeyError, TypeError, ValueError, httpx.HTTPError) as exc:
            raise ValueError("Invalid authentication token") from exc
