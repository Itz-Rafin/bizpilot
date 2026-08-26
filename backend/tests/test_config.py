import pytest

from app.core.config import get_settings


def test_missing_required_backend_configuration_is_explicit(monkeypatch):
    for variable in ("DATABASE_URL", "SUPABASE_URL"):
        monkeypatch.delenv(variable, raising=False)
    get_settings.cache_clear()
    try:
        with pytest.raises(RuntimeError, match="DATABASE_URL, SUPABASE_URL"):
            get_settings()
    finally:
        get_settings.cache_clear()
