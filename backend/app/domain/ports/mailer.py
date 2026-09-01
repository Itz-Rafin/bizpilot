from typing import Protocol


class InvoiceMailer(Protocol):
    def send_invoice(
        self,
        invoice: object,
        recipient_name: str,
        recipient_email: str,
    ) -> None: ...
