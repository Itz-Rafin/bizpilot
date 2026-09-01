from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.use_cases.billing import BillingUseCases
from app.core.config import get_settings
from app.domain.entities.billing import Invoice, InvoiceItem
from app.infrastructure.database.models import CustomerModel, ProductModel, ServiceModel
from app.infrastructure.database.repositories import (
    SqlAlchemyInvoiceRepository,
    SqlAlchemyPaymentRepository,
)
from app.infrastructure.database.session import get_db
from app.infrastructure.email.smtp_mailer import SmtpInvoiceMailer
from app.infrastructure.pdf.invoice_renderer import render_invoice_pdf
from app.presentation.dependencies.auth import Tenant, get_tenant
from app.presentation.schemas.api import InvoiceCreate, InvoiceRead

router = APIRouter(prefix="/invoices", tags=["invoices"])


def use_cases(db: Session = Depends(get_db)) -> BillingUseCases:
    return BillingUseCases(
        SqlAlchemyInvoiceRepository(db),
        SqlAlchemyPaymentRepository(db),
        SmtpInvoiceMailer(get_settings()),
    )


def validate_invoice_links(db: Session, organization_id: UUID, invoice: Invoice) -> None:
    customer = db.scalar(
        select(CustomerModel).where(
            CustomerModel.id == UUID(invoice.customer_id),
            CustomerModel.organization_id == organization_id,
        )
    )
    if customer is None:
        raise ValueError("Customer does not belong to the current organization")

    for item in invoice.items:
        if item.product_id:
            product = db.scalar(
                select(ProductModel).where(
                    ProductModel.id == UUID(item.product_id),
                    ProductModel.organization_id == organization_id,
                )
            )
            if product is None:
                raise ValueError("Product does not belong to the current organization")
        if item.service_id:
            service = db.scalar(
                select(ServiceModel).where(
                    ServiceModel.id == UUID(item.service_id),
                    ServiceModel.organization_id == organization_id,
                )
            )
            if service is None:
                raise ValueError("Service does not belong to the current organization")


@router.get("", response_model=list[InvoiceRead])
def list_invoices(
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    return SqlAlchemyInvoiceRepository(db).list(
        tenant.organization_id, status_filter, search, offset, limit
    )


@router.post("", response_model=InvoiceRead, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: InvoiceCreate,
    tenant: Tenant = Depends(get_tenant),
    cases: BillingUseCases = Depends(use_cases),
):
    invoice_number = cases.invoices.next_number(tenant.organization_id)
    invoice = Invoice(
        organization_id=str(tenant.organization_id),
        customer_id=str(payload.customer_id),
        invoice_number=invoice_number,
        issue_date=payload.issue_date,
        due_date=payload.due_date,
        items=[
            InvoiceItem(
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                product_id=str(item.product_id) if item.product_id else None,
                service_id=str(item.service_id) if item.service_id else None,
            )
            for item in payload.items
        ],
        tax_rate=payload.tax_rate,
        discount=payload.discount,
        notes=payload.notes,
    )
    try:
        return cases.create_invoice(tenant, invoice)
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{invoice_id}", response_model=InvoiceRead)
def get_invoice(
    invoice_id: UUID, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)
):
    item = SqlAlchemyInvoiceRepository(db).get(tenant.organization_id, invoice_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return item


@router.post("/{invoice_id}/send", response_model=InvoiceRead)
def send_invoice(
    invoice_id: UUID,
    tenant: Tenant = Depends(get_tenant),
    cases: BillingUseCases = Depends(use_cases),
    db: Session = Depends(get_db),
):
    invoice = cases.invoices.get(tenant.organization_id, invoice_id)
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    customer = db.scalar(
        select(CustomerModel).where(
            CustomerModel.organization_id == tenant.organization_id,
            CustomerModel.id == UUID(invoice.customer_id),
        )
    )
    if customer is None:
        raise HTTPException(status_code=404, detail="Invoice customer not found")
    try:
        return cases.send_invoice(tenant, invoice_id, customer.name, customer.email or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: UUID, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)
):
    item = SqlAlchemyInvoiceRepository(db).get(tenant.organization_id, invoice_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    pdf = render_invoice_pdf(item)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{item.invoice_number}.pdf"'},
    )


@router.post("/{invoice_id}/cancel", response_model=InvoiceRead)
def cancel_invoice(
    invoice_id: UUID,
    tenant: Tenant = Depends(get_tenant),
    cases: BillingUseCases = Depends(use_cases),
):
    try:
        item = cases.cancel_invoice(tenant, invoice_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if item is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return item


@router.patch("/{invoice_id}", response_model=InvoiceRead)
def update_draft_invoice(
    invoice_id: UUID,
    payload: InvoiceCreate,
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    repository = SqlAlchemyInvoiceRepository(db)
    existing = repository.get(tenant.organization_id, invoice_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice = Invoice(
        organization_id=str(tenant.organization_id),
        customer_id=str(payload.customer_id),
        invoice_number=existing.invoice_number,
        issue_date=payload.issue_date,
        due_date=payload.due_date,
        items=[
            InvoiceItem(
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                product_id=str(item.product_id) if item.product_id else None,
                service_id=str(item.service_id) if item.service_id else None,
            )
            for item in payload.items
        ],
        tax_rate=payload.tax_rate,
        discount=payload.discount,
        notes=payload.notes,
    )
    try:
        validate_invoice_links(db, tenant.organization_id, invoice)
        return repository.update_draft(tenant.organization_id, invoice_id, invoice)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_draft_invoice(
    invoice_id: UUID, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)
):
    try:
        deleted = SqlAlchemyInvoiceRepository(db).delete_draft(tenant.organization_id, invoice_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Invoice not found")
