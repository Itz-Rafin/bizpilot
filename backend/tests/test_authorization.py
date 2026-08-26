from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID

import pytest

from app.application.use_cases.billing import BillingUseCases
from app.domain.entities.billing import Invoice, Payment, PaymentMethod
from app.domain.ports.repositories import TenantContext

ORG_A = UUID("00000000-0000-0000-0000-000000000001")
ORG_B = UUID("00000000-0000-0000-0000-000000000002")
USER_A = UUID("00000000-0000-0000-0000-000000000011")


class InvoiceRepo:
    def __init__(self, invoice=None):
        self.invoice = invoice

    def next_number(self, organization_id):
        return "INV-00001"

    def create(self, invoice):
        return invoice

    def get(self, organization_id, invoice_id):
        return (
            self.invoice
            if self.invoice
            and organization_id == ORG_A
            and self.invoice.organization_id == str(organization_id)
            else None
        )

    def lock_for_payment(self, organization_id, invoice_id):
        return self.get(organization_id, invoice_id)

    def list(self, *args):
        return []

    def save_status(self, organization_id, invoice_id, status):
        return SimpleNamespace(status=status)


class PaymentRepo:
    def __init__(self):
        self.saved = []

    def list_for_invoice(self, organization_id, invoice_id):
        return []

    def create(self, payment):
        self.saved.append(payment)
        return payment


def tenant():
    return TenantContext(USER_A, ORG_A, "owner")


def valid_invoice(organization_id: UUID):
    from app.domain.entities.billing import InvoiceItem

    return Invoice(
        str(organization_id),
        "customer",
        "INV-1",
        date(2026, 1, 1),
        date(2026, 1, 2),
        [InvoiceItem("Work", Decimal("1"), Decimal("10"))],
    )


def test_invoice_create_rejects_client_supplied_other_organization():
    cases = BillingUseCases(InvoiceRepo(), PaymentRepo())
    with pytest.raises(PermissionError, match="does not match"):
        cases.create_invoice(tenant(), valid_invoice(ORG_B))


def test_payment_against_other_organization_is_not_found():
    cases = BillingUseCases(InvoiceRepo(valid_invoice(ORG_B)), PaymentRepo())
    payment = Payment(
        "00000000-0000-0000-0000-000000000021",
        str(ORG_A),
        Decimal("1"),
        PaymentMethod.CASH,
        date(2026, 1, 2),
    )
    with pytest.raises(KeyError, match="Invoice not found"):
        cases.record_payment(tenant(), payment)


def test_paid_and_cancelled_invoices_reject_payments():
    for state in ("paid", "cancelled"):
        cases = BillingUseCases(
            InvoiceRepo(
                SimpleNamespace(status=state, total=Decimal("10"), organization_id=str(ORG_A))
            ),
            PaymentRepo(),
        )
        payment = Payment(
            "00000000-0000-0000-0000-000000000021",
            str(ORG_A),
            Decimal("1"),
            PaymentMethod.CASH,
            date(2026, 1, 2),
        )
        with pytest.raises(ValueError, match=state):
            cases.record_payment(tenant(), payment)
