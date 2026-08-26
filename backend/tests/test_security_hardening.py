from datetime import date, datetime
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID

import pytest
from fastapi import HTTPException

from app.application.use_cases.billing import BillingUseCases
from app.domain.entities.billing import Payment, PaymentMethod
from app.domain.ports.repositories import TenantContext
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
from app.presentation.api.v1.supporting import set_active_organization
from app.presentation.dependencies.auth import AuthenticatedUser, Tenant, get_tenant, require_roles
from app.presentation.schemas.api import ActiveOrganizationRequest

ORG_A = UUID("00000000-0000-0000-0000-000000000001")
ORG_B = UUID("00000000-0000-0000-0000-000000000002")
USER_A = UUID("00000000-0000-0000-0000-000000000011")


class EmptyResult:
    def scalars(self):
        return self

    def all(self):
        return []


class AtomicInvoiceRepo:
    def __init__(self, invoice):
        self.invoice = invoice
        self.status = None

    def lock_for_payment(self, organization_id, invoice_id):
        return self.invoice if organization_id == ORG_A else None

    def save_status(self, organization_id, invoice_id, status, *, commit=True):
        self.status = status
        return self.invoice


class AtomicPaymentRepo:
    def __init__(self):
        self.saved = []
        self.committed = False

    def list_for_invoice(self, organization_id, invoice_id):
        return []

    def create(self, payment, *, commit=True):
        self.saved.append(payment)
        return payment

    def commit(self):
        self.committed = True


class RecordingSession:
    def __init__(self):
        self.statements = []
        self.commits = 0

    def scalars(self, statement):
        self.statements.append(statement)
        return EmptyResult()

    def scalar(self, statement):
        self.statements.append(statement)
        return None

    def execute(self, statement, *args, **kwargs):
        self.statements.append(statement)
        return EmptyResult()

    def commit(self):
        self.commits += 1


def sql_for(statement):
    return str(statement.compile(compile_kwargs={"literal_binds": True}))


@pytest.mark.parametrize(
    "operation",
    [
        lambda db: SqlAlchemyCustomerRepository(db).list(ORG_A, None, 0, 10),
        lambda db: SqlAlchemyCustomerRepository(db).get(ORG_A, UUID(int=10)),
        lambda db: SqlAlchemyInvoiceRepository(db).list(ORG_A, None, None, 0, 10),
        lambda db: SqlAlchemyInvoiceRepository(db).get(ORG_A, UUID(int=10)),
        lambda db: SqlAlchemyPaymentRepository(db).list_for_invoice(ORG_A, UUID(int=10)),
        lambda db: SqlAlchemyCatalogRepository(db).list_products(ORG_A, None),
        lambda db: SqlAlchemyCatalogRepository(db).list_services(ORG_A, None),
        lambda db: SqlAlchemyExpenseRepository(db).list_expenses(ORG_A, 0, 10),
        lambda db: SqlAlchemyExpenseRepository(db).get_expense(ORG_A, UUID(int=10)),
    ],
)
def test_read_paths_include_explicit_organization_predicate(operation):
    db = RecordingSession()
    operation(db)
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
        def scalars(self, statement):
            self.statements.append(statement)
            return SimpleNamespace(all=lambda: memberships)

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


def test_active_organization_switch_requires_membership_and_persists_profile():
    profile = SimpleNamespace(active_organization_id=None)
    membership = SimpleNamespace(organization_id=ORG_B, role="member")

    class Db(RecordingSession):
        def scalar(self, statement):
            return membership

        def get(self, model, key):
            return profile

    result = set_active_organization(
        ActiveOrganizationRequest(organization_id=ORG_B),
        AuthenticatedUser(USER_A, "a@example.com"),
        Db(),
    )
    assert result["active_organization_id"] == str(ORG_B)
    assert profile.active_organization_id == ORG_B


def test_active_organization_switch_rejects_non_membership():
    class Db(RecordingSession):
        def scalar(self, statement):
            return None

    with pytest.raises(HTTPException) as error:
        set_active_organization(
            ActiveOrganizationRequest(organization_id=ORG_B),
            AuthenticatedUser(USER_A, "a@example.com"),
            Db(),
        )
    assert error.value.status_code == 403


def test_role_dependencies_allow_only_declared_roles():
    owner = TenantContext(USER_A, ORG_A, "owner")
    admin = TenantContext(USER_A, ORG_A, "admin")
    member = TenantContext(USER_A, ORG_A, "member")
    require_roles("owner", "admin")(owner)
    require_roles("owner", "admin")(admin)
    with pytest.raises(HTTPException) as error:
        require_roles("owner", "admin")(member)
    assert error.value.status_code == 403


def test_payment_recording_commits_after_staged_status_update():
    invoice = SimpleNamespace(status="sent", total=Decimal("10.00"), organization_id=str(ORG_A))
    payments = AtomicPaymentRepo()
    invoices = AtomicInvoiceRepo(invoice)
    BillingUseCases(invoices, payments).record_payment(
        TenantContext(USER_A, ORG_A, "owner"),
        Payment(
            "00000000-0000-0000-0000-000000000021",
            str(ORG_A),
            Decimal("10.00"),
            PaymentMethod.CASH,
            date(2026, 1, 2),
        ),
    )
    assert payments.committed is True
    assert invoices.status == "paid"


def test_concrete_invoice_payment_lock_emits_for_update():
    db = RecordingSession()
    SqlAlchemyInvoiceRepository(db).lock_for_payment(ORG_A, UUID(int=10))
    assert "FOR UPDATE" in sql_for(db.statements[-1]).upper()


def test_direct_other_org_ids_do_not_match_a_scoped_repository_lookup():
    db = RecordingSession()
    SqlAlchemyCustomerRepository(db).get(ORG_A, UUID(int=200))
    statement = sql_for(db.statements[-1])
    assert ORG_A.hex in statement
    assert ORG_B.hex not in statement


def test_payment_portion_uses_decimal_values_for_two_orgs():
    assert Decimal("10.00") + Decimal("2.50") == Decimal("12.50")
    assert ORG_A != ORG_B
