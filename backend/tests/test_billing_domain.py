from datetime import date
from decimal import Decimal

import pytest

from app.domain.entities.billing import (
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    Payment,
    PaymentMethod,
    money,
    payment_balance,
    status_after_payment,
)


def item(quantity="2", unit_price="12.345"):
    return InvoiceItem("Consulting", Decimal(quantity), Decimal(unit_price))


def invoice(**kwargs):
    values = {
        "organization_id": "org",
        "customer_id": "customer",
        "invoice_number": "INV-1",
        "issue_date": date(2026, 1, 1),
        "due_date": date(2026, 1, 31),
        "items": [item()],
    }
    values.update(kwargs)
    return Invoice(**values)


def payment(amount):
    return Payment("invoice", "org", Decimal(amount), PaymentMethod.CASH, date(2026, 1, 2))


def test_money_uses_decimal_half_up_rounding():
    assert money("12.345") == Decimal("12.35")
    assert money("0.004") == Decimal("0.00")


def test_invoice_calculates_subtotal_tax_discount_and_total():
    current = invoice(
        items=[item("2", "12.345"), item("1", "10")],
        tax_rate=Decimal("10"),
        discount=Decimal("2"),
    )
    assert current.subtotal == Decimal("34.69")
    assert current.tax == Decimal("3.47")
    assert current.total == Decimal("36.16")


@pytest.mark.parametrize("quantity", ["0", "-1"])
def test_zero_or_negative_quantity_is_rejected(quantity):
    with pytest.raises(ValueError, match="quantity"):
        item(quantity=quantity)


def test_negative_price_and_invalid_dates_are_rejected():
    with pytest.raises(ValueError, match="price"):
        item(unit_price="-0.01")
    with pytest.raises(ValueError, match="Due date"):
        invoice(due_date=date(2025, 12, 31))


def test_tax_rate_and_discount_boundaries_are_rejected():
    with pytest.raises(ValueError, match="Tax rate"):
        invoice(tax_rate=Decimal("100.01"))
    with pytest.raises(ValueError, match="Discount"):
        invoice(discount=Decimal("-0.01"))


def test_invoice_send_requires_items_and_cancel_rejects_paid():
    empty = invoice(items=[])
    with pytest.raises(ValueError, match="at least one item"):
        empty.mark_sent()
    paid = invoice(status=InvoiceStatus.PAID)
    with pytest.raises(ValueError, match="Paid"):
        paid.cancel()


def test_payment_balance_supports_partial_and_exact_payment():
    current = invoice()
    assert payment_balance(current.total, [payment("10")]) == current.total - Decimal("10")
    assert payment_balance(current.total, [payment(str(current.total))]) == Decimal("0.00")
    assert status_after_payment(current.total, [payment(str(current.total))]) == InvoiceStatus.PAID


def test_overpayment_and_non_positive_payment_are_rejected():
    current = invoice()
    with pytest.raises(ValueError, match="exceed"):
        payment_balance(current.total, [payment(str(current.total + Decimal("0.01")))])
    with pytest.raises(ValueError, match="greater"):
        payment("0")
    with pytest.raises(ValueError, match="greater"):
        payment("-1")
