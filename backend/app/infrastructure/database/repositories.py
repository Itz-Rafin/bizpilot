from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session, selectinload

from app.domain.entities.billing import Invoice, Payment
from app.domain.ports.repositories import (
    CustomerRepository,
    DashboardRepository,
    InvoiceRepository,
    PaymentRepository,
)
from app.infrastructure.database.models import (
    CustomerModel,
    ExpenseModel,
    InvoiceItemModel,
    InvoiceModel,
    PaymentModel,
)


class SqlAlchemyCustomerRepository(CustomerRepository):
    def __init__(self, session: Session):
        self.session = session

    def list(self, organization_id, search, offset, limit):
        query = select(CustomerModel).where(CustomerModel.organization_id == organization_id)
        if search:
            term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    CustomerModel.name.ilike(term),
                    CustomerModel.email.ilike(term),
                    CustomerModel.company.ilike(term),
                )
            )
        return self.session.scalars(
            query.order_by(CustomerModel.created_at.desc()).offset(offset).limit(limit)
        ).all()

    def get(self, organization_id, customer_id):
        return self.session.scalar(
            select(CustomerModel).where(
                CustomerModel.organization_id == organization_id, CustomerModel.id == customer_id
            )
        )

    def create(self, organization_id, values):
        item = CustomerModel(organization_id=organization_id, **values)
        self.session.add(item)
        self.session.commit()
        self.session.refresh(item)
        return item

    def update(self, organization_id, customer_id, values):
        item = self.get(organization_id, customer_id)
        if item is None:
            return None
        for key, value in values.items():
            setattr(item, key, value)
        self.session.commit()
        self.session.refresh(item)
        return item

    def archive(self, organization_id, customer_id):
        result = self.session.execute(
            update(CustomerModel)
            .where(
                CustomerModel.organization_id == organization_id, CustomerModel.id == customer_id
            )
            .values(status="archived")
        )
        self.session.commit()
        return result.rowcount == 1


class SqlAlchemyInvoiceRepository(InvoiceRepository):
    def __init__(self, session: Session):
        self.session = session

    def next_number(self, organization_id):
        current = (
            self.session.scalar(
                select(func.count(InvoiceModel.id)).where(
                    InvoiceModel.organization_id == organization_id
                )
            )
            or 0
        )
        return f"INV-{current + 1:05d}"

    def create(self, invoice: Invoice):
        model = InvoiceModel(
            organization_id=UUID(invoice.organization_id),
            customer_id=UUID(invoice.customer_id),
            invoice_number=invoice.invoice_number,
            issue_date=invoice.issue_date,
            due_date=invoice.due_date,
            status=invoice.status.value,
            subtotal=invoice.subtotal,
            tax=invoice.tax,
            discount=invoice.discount,
            total=invoice.total,
            notes=invoice.notes,
        )
        model.items = [
            InvoiceItemModel(
                product_id=UUID(item.product_id) if item.product_id else None,
                service_id=UUID(item.service_id) if item.service_id else None,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total=item.total,
            )
            for item in invoice.items
        ]
        self.session.add(model)
        self.session.commit()
        self.session.refresh(model)
        return model

    def get(self, organization_id, invoice_id):
        return self.session.scalar(
            select(InvoiceModel)
            .options(selectinload(InvoiceModel.items))
            .where(InvoiceModel.organization_id == organization_id, InvoiceModel.id == invoice_id)
        )

    def list(self, organization_id, status, search, offset, limit):
        query = select(InvoiceModel).where(InvoiceModel.organization_id == organization_id)
        if status:
            query = query.where(InvoiceModel.status == status)
        if search:
            query = query.where(InvoiceModel.invoice_number.ilike(f"%{search.strip()}%"))
        return self.session.scalars(
            query.order_by(InvoiceModel.issue_date.desc()).offset(offset).limit(limit)
        ).all()

    def save_status(self, organization_id, invoice_id, status):
        item = self.get(organization_id, invoice_id)
        if item is None:
            return None
        item.status = status
        self.session.commit()
        self.session.refresh(item)
        return item


class SqlAlchemyPaymentRepository(PaymentRepository):
    def __init__(self, session: Session):
        self.session = session

    def list_for_invoice(self, organization_id, invoice_id):
        rows = self.session.scalars(
            select(PaymentModel).where(
                PaymentModel.organization_id == organization_id,
                PaymentModel.invoice_id == invoice_id,
            )
        ).all()
        return [
            Payment(
                invoice_id=str(row.invoice_id),
                organization_id=str(row.organization_id),
                amount=row.amount,
                payment_method=row.payment_method,
                payment_date=row.payment_date,
                reference=row.reference,
                notes=row.notes,
            )
            for row in rows
        ]

    def create(self, payment: Payment):
        model = PaymentModel(
            organization_id=UUID(payment.organization_id),
            invoice_id=UUID(payment.invoice_id),
            amount=payment.amount,
            payment_method=payment.payment_method.value,
            payment_date=payment.payment_date,
            reference=payment.reference,
            notes=payment.notes,
        )
        self.session.add(model)
        self.session.commit()
        self.session.refresh(model)
        return model


class SqlAlchemyDashboardRepository(DashboardRepository):
    def __init__(self, session: Session):
        self.session = session

    def metrics(self, organization_id, start: date, end: date):
        revenue = (
            self.session.scalar(
                select(func.coalesce(func.sum(PaymentModel.amount), 0)).where(
                    PaymentModel.organization_id == organization_id,
                    PaymentModel.payment_date.between(start, end),
                )
            )
            or 0
        )
        expenses = (
            self.session.scalar(
                select(func.coalesce(func.sum(ExpenseModel.amount), 0)).where(
                    ExpenseModel.organization_id == organization_id,
                    ExpenseModel.expense_date.between(start, end),
                )
            )
            or 0
        )
        customer_count = (
            self.session.scalar(
                select(func.count(CustomerModel.id)).where(
                    CustomerModel.organization_id == organization_id,
                    CustomerModel.status == "active",
                )
            )
            or 0
        )
        outstanding = (
            self.session.scalar(
                select(func.coalesce(func.sum(InvoiceModel.total), 0)).where(
                    InvoiceModel.organization_id == organization_id,
                    InvoiceModel.status.in_(["sent", "overdue"]),
                )
            )
            or 0
        )
        return {
            "revenue": revenue,
            "expenses": expenses,
            "profit": revenue - expenses,
            "customer_count": customer_count,
            "outstanding": outstanding,
        }
