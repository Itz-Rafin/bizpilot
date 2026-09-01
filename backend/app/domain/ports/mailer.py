from typing import Protocol

from app.domain.entities.billing import Invoice


class InvoiceMailer(Protocol):
    def send_invoice(
        self,
        invoice: Invoice,
        recipient_name: str,
        recipient_email: str,
        pdf: bytes,
    ) -> None: ...
