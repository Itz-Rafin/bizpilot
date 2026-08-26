from dataclasses import dataclass
from uuid import UUID

from app.domain.entities.billing import Invoice, Payment, payment_balance, status_after_payment
from app.domain.ports.repositories import InvoiceRepository, PaymentRepository, TenantContext


@dataclass(slots=True)
class BillingUseCases:
    invoices: InvoiceRepository
    payments: PaymentRepository

    def create_invoice(self, tenant: TenantContext, invoice: Invoice):
        if invoice.organization_id != str(tenant.organization_id):
            raise PermissionError("Invoice organization does not match tenant")
        return self.invoices.create(invoice)

    def send_invoice(self, tenant: TenantContext, invoice_id: UUID):
        invoice = self.invoices.get(tenant.organization_id, invoice_id)
        if invoice is None:
            return None
        if invoice.status not in ("draft", "sent"):
            raise ValueError("Only draft or sent invoices can be sent")
        return self.invoices.save_status(tenant.organization_id, invoice_id, "sent")

    def cancel_invoice(self, tenant: TenantContext, invoice_id: UUID):
        invoice = self.invoices.get(tenant.organization_id, invoice_id)
        if invoice is None:
            return None
        if invoice.status == "paid":
            raise ValueError("Paid invoices cannot be cancelled")
        return self.invoices.save_status(tenant.organization_id, invoice_id, "cancelled")

    def record_payment(self, tenant: TenantContext, payment: Payment):
        invoice_id = UUID(payment.invoice_id)
        invoice = self.invoices.lock_for_payment(tenant.organization_id, invoice_id)
        if invoice is None:
            raise KeyError("Invoice not found")
        if invoice.status in ("cancelled", "paid"):
            raise ValueError(f"Payments cannot be recorded against a {invoice.status} invoice")
        existing = self.payments.list_for_invoice(tenant.organization_id, invoice_id)
        payment_balance(invoice.total, [*existing, payment])
        saved = self.payments.create(payment, commit=False)
        new_status = status_after_payment(invoice.total, [*existing, payment])
        self.invoices.save_status(
            tenant.organization_id, invoice_id, new_status.value, commit=False
        )
        self.payments.commit()
        return saved
