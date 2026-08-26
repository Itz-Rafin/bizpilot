from pathlib import Path


FORBIDDEN = ("fastapi", "sqlalchemy", "supabase", "postgres", "httpx")


def test_domain_has_no_framework_or_infrastructure_imports():
    domain_root = Path(__file__).parents[1] / "app" / "domain"
    for path in domain_root.rglob("*.py"):
        source = path.read_text()
        lowered = source.lower()
        assert not any(f"import {name}" in lowered or f"from {name}" in lowered for name in FORBIDDEN), path
