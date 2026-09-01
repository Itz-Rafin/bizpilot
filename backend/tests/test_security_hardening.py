from datetime import date, datetime
from types import SimpleNamespace
from uuid import UUID

import pytest
from fastapi import HTTPException

from app.infrastructure.database.operations_repositories import (
    SqlAlchemyCatalogRepository,
    SqlAlchemyExpenseRepository,
)
from app.infrastructure.database.repositories import (
    SqlAlchemyCustomerRepository,
    SqlAlchemyDashboardRepository,
    SqlAlchemyInvoiceRepository,
    SqlAlchemyPaymentRepository,
)
from app.presentation.dependencies.auth import AuthenticatedUser, Tenant, get_tenant

ORG_A = UUID("00000000-0000-0000-0000-000000000001")
ORG_B = UUID("00000000-0000-0000-0000-000000000002")
USER_A = UUID("00000000-0000-0000-0000-000000000011")


class EmptyResult:
    def scalars(self):
        return self

    def all(self):
        return []


class RecordingSession:
    def __init__(self):
        self.statements = []
        self.commits = 0

    def execute(self, statement, params=None):
        self.statements.append(statement)
        return EmptyResult()

    def scalars(self, statement):
        self.statements.append(statement)
        return EmptyResult()

    def scalar(self, statement):
        self.statements.append(statement)
        return None

    def get(self, model, key):
        return None

    def flush(self):
        pass

    def commit(self):
        self.commits += 1


def sql_for(statement):
    return str(statement.compile(compile_kwargs={"literal_binds": True}))


def test_repository_queries_are_organization_scoped():
    db = RecordingSession()
    SqlAlchemyCustomerRepository(db).list(ORG_A, "", 0, 50)
    SqlAlchemyInvoiceRepository(db).list(ORG_A, None, "", 0, 50)
    SqlAlchemyPaymentRepository(db).list_for_invoice(ORG_A, UUID(int=3))
    SqlAlchemyCatalogRepository(db).list_products(ORG_A, "")
    SqlAlchemyExpenseRepository(db).list_expenses(ORG_A, 0, 50)
    assert db.statements
    assert all("organization_id" in sql_for(statement) for statement in db.statements)


def test_dashboard_aggregates_are_organization_scoped():
    db = RecordingSession()
    SqlAlchemyDashboardRepository(db).metrics(ORG_A, date(2026, 1, 1), date(2026, 1, 31))
    assert len(db.statements) == 4
    assert all("organization_id" in sql_for(statement) for statement in db.statements)


def test_persisted_active_organization_wins_over_membership_order():
    memberships = [
        SimpleNamespace(organization_id=ORG_B, role="member", created_at=datetime(2026, 1, 1)),
        SimpleNamespace(organization_id=ORG_A, role="admin", created_at=datetime(2026, 1, 2)),
    ]
    profile = SimpleNamespace(active_organization_id=ORG_A)

    class Db(RecordingSession):
        def scalar(self, statement):
            self.statements.append(statement)
            return memberships[1]

        def get(self, model, key):
            return profile

    tenant = get_tenant(AuthenticatedUser(USER_A, "a@example.com"), Db())
    assert tenant == Tenant(USER_A, ORG_A, "admin")


def test_multi_organization_user_without_active_context_fails_closed():
    memberships = [
        SimpleNamespace(organization_id=ORG_A, role="owner", created_at=datetime(2026, 1, 1)),
        SimpleNamespace(organization_id=ORG_B, role="member", created_at=datetime(2026, 1, 2)),
    ]

    class Db(RecordingSession):
        def scalars(self, statement):
            return SimpleNamespace(all=lambda: memberships)

        def get(self, model, key):
            return SimpleNamespace(active_organization_id=None)

    with pytest.raises(HTTPException) as error:
        get_tenant(AuthenticatedUser(USER_A, "a@example.com"), Db())
    assert error.value.status_code == 400
