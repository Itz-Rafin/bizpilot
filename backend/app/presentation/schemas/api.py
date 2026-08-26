from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=40)
    company: str | None = Field(default=None, max_length=160)
    address: str | None = None
    notes: str | None = None


class CustomerUpdate(CustomerCreate):
    name: str | None = Field(default=None, min_length=1, max_length=160)


class CustomerRead(ORMModel):
    id: UUID
    organization_id: UUID
    name: str
    email: EmailStr | None = None
    phone: str | None = None
    company: str | None = None
    address: str | None = None
    notes: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class InvoiceItemCreate(BaseModel):
    description: str = Field(min_length=1, max_length=240)
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    product_id: UUID | None = None
    service_id: UUID | None = None


class InvoiceCreate(BaseModel):
    customer_id: UUID
    issue_date: date
    due_date: date
    items: list[InvoiceItemCreate] = Field(min_length=1)
    tax_rate: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    discount: Decimal = Field(default=Decimal("0"), ge=0)
    notes: str | None = None


class InvoiceItemRead(ORMModel):
    id: UUID
    description: str
    quantity: Decimal
    unit_price: Decimal
    total: Decimal
    product_id: UUID | None = None
    service_id: UUID | None = None


class InvoiceRead(ORMModel):
    id: UUID
    organization_id: UUID
    customer_id: UUID
    invoice_number: str
    issue_date: date
    due_date: date
    status: str
    subtotal: Decimal
    tax: Decimal
    discount: Decimal
    total: Decimal
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[InvoiceItemRead] = []


class PaymentCreate(BaseModel):
    invoice_id: UUID
    amount: Decimal = Field(gt=0)
    payment_method: str = Field(min_length=1, max_length=30)
    payment_date: date
    reference: str | None = Field(default=None, max_length=120)
    notes: str | None = None


class PaymentRead(ORMModel):
    id: UUID
    organization_id: UUID
    invoice_id: UUID
    amount: Decimal
    payment_method: str
    payment_date: date
    reference: str | None = None
    notes: str | None = None
    created_at: datetime


class ExpenseCreate(BaseModel):
    category_id: UUID | None = None
    description: str = Field(min_length=1, max_length=240)
    amount: Decimal = Field(gt=0)
    expense_date: date
    payment_method: str = Field(min_length=1, max_length=30)
    notes: str | None = None


class ExpenseRead(ORMModel):
    id: UUID
    organization_id: UUID
    category_id: UUID | None = None
    description: str
    amount: Decimal
    expense_date: date
    payment_method: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class DashboardMetrics(BaseModel):
    revenue: Decimal
    expenses: Decimal
    profit: Decimal
    customer_count: int
    outstanding: Decimal
    period_start: date
    period_end: date


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    sku: str | None = Field(default=None, max_length=80)
    description: str | None = None
    price: Decimal = Field(ge=0)
    cost: Decimal = Field(default=Decimal("0"), ge=0)
    quantity: Decimal = Field(default=Decimal("0"), ge=0)
    low_stock_threshold: Decimal = Field(default=Decimal("0"), ge=0)


class ProductRead(ORMModel):
    id: UUID
    organization_id: UUID
    name: str
    sku: str | None = None
    description: str | None = None
    price: Decimal
    cost: Decimal
    quantity: Decimal
    low_stock_threshold: Decimal
    status: str
    created_at: datetime
    updated_at: datetime


class ServiceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    price: Decimal = Field(ge=0)
    duration_minutes: int | None = Field(default=None, gt=0)


class ServiceRead(ORMModel):
    id: UUID
    organization_id: UUID
    name: str
    description: str | None = None
    price: Decimal
    duration_minutes: int | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class NotificationRead(ORMModel):
    id: UUID
    organization_id: UUID
    user_id: UUID | None = None
    type: str
    title: str
    message: str
    read: bool
    created_at: datetime


class ActivityRead(ORMModel):
    id: UUID
    organization_id: UUID
    user_id: UUID
    action: str
    entity_type: str
    entity_id: UUID | None = None
    metadata_json: dict = {}
    created_at: datetime


class OrganizationSummary(BaseModel):
    id: UUID
    name: str
    role: str


class OrganizationContextRead(ORMModel):
    id: UUID
    name: str
    currency: str
    timezone: str


class ProfileContextRead(ORMModel):
    id: UUID
    full_name: str | None = None
    avatar_url: str | None = None


class WorkspaceContext(BaseModel):
    organization: OrganizationContextRead | None = None
    profile: ProfileContextRead | None = None
    role: str | None = None
    active_organization_id: UUID | None = None
    organizations: list[OrganizationSummary]


class ActiveOrganizationRequest(BaseModel):
    organization_id: UUID


class ActiveOrganizationResponse(BaseModel):
    active_organization_id: UUID


class TeamMemberRead(ORMModel):
    user_id: UUID
    organization_id: UUID
    role: str
    created_at: datetime
