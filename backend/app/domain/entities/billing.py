"""Core billing entities and rules.

This module intentionally has no framework or database imports.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from enum import StrEnum

CENT = Decimal("0.01")


def money(value: Decimal | int | str | float) -> Decimal:
    return Decimal(str(value)).quantize(CENT, rounding=ROUND_HALF_UP)


class InvoiceStatus(StrEnum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class PaymentMethod(StrEnum):
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    CARD = "card"
    MOBILE_PAYMENT = "mobile_payment"
    OTHER = "other"


@dataclass(slots=True)
class InvoiceItem:
    description: str
    quantity: Decimal
    unit_price: Decimal
    product_id: str | None = None
    service_id: str | None = None

    def __post_init__(self) -> None:
        if not self.description.strip():
            raise ValueError("Invoice item description is required")
        if self.quantity <= 0:
            raise ValueError("Invoice item quantity must be greater than zero")
        if self.unit_price < 0:
            raise ValueError("Invoice item unit price cannot be negative")

    @property
    def total(self) -> Decimal:
        return money(self.quantity * self.unit_price)


@dataclass(slots=True)
class Invoice:
    organization_id: str
    customer_id: str
    invoice_number: str
    issue_date: date
    due_date: date
    items: list[InvoiceItem] = field(default_factory=list)
    tax_rate: Decimal = Decimal("0")
    discount: Decimal = Decimal("0")
    status: InvoiceStatus = InvoiceStatus.DRAFT
    notes: str | None = None

    def __post_init__(self) -> None:
        if self.due_date < self.issue_date:
            raise ValueError("Due date cannot be before issue date")
        if self.tax_rate < 0 or self.tax_rate > 100:
            raise ValueError("Tax rate must be between 0 and 100")
        if self.discount < 0:
            raise ValueError("Discount cannot be negative")

    @property
    def subtotal(self) -> Decimal:
        return money(sum((item.total for item in self.items), Decimal("0")))

    @property
    def tax(self) -> Decimal:
        return money(self.subtotal * self.tax_rate / Decimal("100"))

    @property
    def total(self) -> Decimal:
        return money(max(Decimal("0"), self.subtotal + self.tax - self.discount))

    def mark_sent(self) -> None:
        if self.status not in (InvoiceStatus.DRAFT, InvoiceStatus.SENT):
            raise ValueError("Only draft invoices can be sent")
        if not self.items:
            raise ValueError("An invoice must contain at least one item")
        self.status = InvoiceStatus.SENT

    def cancel(self) -> None:
        if self.status == InvoiceStatus.PAID:
            raise ValueError("Paid invoices cannot be cancelled")
        self.status = InvoiceStatus.CANCELLED


@dataclass(slots=True)
class Payment:
    invoice_id: str
    organization_id: str
    amount: Decimal
    payment_method: PaymentMethod
    payment_date: date
    reference: str | None = None
    notes: str | None = None

    def __post_init__(self) -> None:
        if self.amount <= 0:
            raise ValueError("Payment amount must be greater than zero")


def payment_balance(invoice_total: Decimal, payments: Iterable[Payment]) -> Decimal:
    paid = money(sum((payment.amount for payment in payments), Decimal("0")))
    balance = money(invoice_total - paid)
    if balance < 0:
        raise ValueError("Payment total cannot exceed invoice total")
    return balance


def status_after_payment(invoice_total: Decimal, payments: Iterable[Payment]) -> InvoiceStatus:
    if payment_balance(invoice_total, payments) == 0:
        return InvoiceStatus.PAID
    return InvoiceStatus.SENT
