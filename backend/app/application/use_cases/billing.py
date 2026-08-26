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
        return self.invoices.save_status(tenant.organization_id, invoice_id, "sent")

    def cancel_invoice(self, tenant: TenantContext, invoice_id: UUID):
        invoice = self.invoices.get(tenant.organization_id, invoice_id)
        if invoice is None:
            return None
        return self.invoices.save_status(tenant.organization_id, invoice_id, "cancelled")

    def record_payment(self, tenant: TenantContext, payment: Payment, invoice_total):
        existing = self.payments.list_for_invoice(tenant.organization_id, UUID(payment.invoice_id))
        payment_balance(invoice_total, [*existing, payment])
        saved = self.payments.create(payment)
        new_status = status_after_payment(invoice_total, [*existing, payment])
        self.invoices.save_status(
            tenant.organization_id, UUID(payment.invoice_id), new_status.value
        )
        return saved
