from fastapi.testclient import TestClient

from app.main import app


def test_health_and_openapi_are_available():
    client = TestClient(app)
    assert client.get("/health").status_code == 200
    assert client.get("/api/v1/openapi.json").status_code == 200


def test_protected_route_rejects_missing_authentication():
    client = TestClient(app)
    response = client.get("/api/v1/customers")
    assert response.status_code == 401


def test_protected_route_rejects_malformed_authentication():
    client = TestClient(app)
    response = client.get("/api/v1/customers", headers={"Authorization": "Bearer malformed"})
    assert response.status_code == 401
