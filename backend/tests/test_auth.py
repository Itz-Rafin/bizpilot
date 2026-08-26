from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest
from jose import jwt

from app.core.config import Settings
from app.infrastructure.auth.jwt_verifier import SupabaseJwtVerifier

SECRET = "test-secret"
URL = "https://example.supabase.co"
USER_ID = UUID("00000000-0000-0000-0000-000000000001")


def verifier():
    return SupabaseJwtVerifier(
        Settings(
            database_url="postgresql+psycopg://x:x@localhost/x",
            supabase_url=URL,
            supabase_jwt_secret=SECRET,
        )
    )


def token(**overrides):
    claims = {
        "sub": str(USER_ID),
        "aud": "authenticated",
        "iss": f"{URL}/auth/v1",
        "exp": datetime.now(UTC) + timedelta(minutes=5),
    }
    claims.update(overrides)
    return jwt.encode(claims, SECRET, algorithm="HS256")


def test_valid_token_is_verified():
    verified = verifier().verify(token(email="owner@example.com"))
    assert verified.user_id == USER_ID
    assert verified.email == "owner@example.com"


@pytest.mark.parametrize(
    "raw",
    [
        "",
        "not-a-jwt",
        token(sub="not-a-uuid"),
        token(aud="wrong"),
        token(iss="https://attacker.example/auth/v1"),
    ],
)
def test_invalid_tokens_are_rejected(raw):
    with pytest.raises(ValueError, match="Invalid authentication token"):
        verifier().verify(raw)


def test_expired_token_is_rejected():
    with pytest.raises(ValueError, match="Invalid authentication token"):
        verifier().verify(token(exp=datetime.now(UTC) - timedelta(minutes=1)))
