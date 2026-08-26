from datetime import date
from decimal import Decimal

import pytest

from app.domain.entities.billing import (
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    Payment,
    PaymentMethod,
    payment_balance,
)


def invoice():
    return Invoice(
        organization_id="00000000-0000-0000-0000-000000000001",
        customer_id="00000000-0000-0000-0000-000000000002",
        invoice_number="INV-00001",
        issue_date=date(2026, 8, 1),
        due_date=date(2026, 8, 31),
        items=[
            InvoiceItem(
                description="Design sprint", quantity=Decimal("2"), unit_price=Decimal("125.00")
            )
        ],
        tax_rate=Decimal("10"),
        discount=Decimal("15"),
    )


def test_invoice_calculates_totals_with_decimal_arithmetic():
    item = invoice()
    assert item.subtotal == Decimal("250.00")
    assert item.tax == Decimal("25.00")
    assert item.total == Decimal("260.00")


def test_invoice_requires_items_before_sending():
    item = invoice()
    item.mark_sent()
    assert item.status == InvoiceStatus.SENT


def test_due_date_cannot_precede_issue_date():
    with pytest.raises(ValueError, match="Due date"):
        Invoice(
            organization_id="a",
            customer_id="b",
            invoice_number="INV-1",
            issue_date=date(2026, 8, 2),
            due_date=date(2026, 8, 1),
        )


def test_payment_balance_rejects_overpayment():
    payment = Payment(
        invoice_id="b",
        organization_id="a",
        amount=Decimal("260.01"),
        payment_method=PaymentMethod.CASH,
        payment_date=date(2026, 8, 5),
    )
    with pytest.raises(ValueError, match="exceed"):
        payment_balance(Decimal("260.00"), [payment])
