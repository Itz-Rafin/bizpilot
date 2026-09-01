from email.message import EmailMessage
from smtplib import SMTP, SMTP_SSL

from app.core.config import Settings
from app.infrastructure.pdf.invoice_renderer import render_invoice_pdf


class SmtpInvoiceMailer:
    def __init__(self, settings: Settings):
        self.settings = settings

    def send_invoice(self, invoice: object, recipient_name: str, recipient_email: str) -> None:
        if not self.settings.smtp_host or not self.settings.smtp_from_email:
            raise RuntimeError("Invoice email is not configured")

        pdf = render_invoice_pdf(invoice)
        message = EmailMessage()
        message["From"] = self.settings.smtp_from_email
        message["To"] = recipient_email
        message["Subject"] = f"Invoice {invoice.invoice_number}"
        message.set_content(
            f"Hello {recipient_name},\n\n"
            f"Please find invoice {invoice.invoice_number} attached.\n"
            f"Amount due: {invoice.total}\n"
            f"Due date: {invoice.due_date}\n\n"
            "Thank you."
        )
        message.add_attachment(
            pdf,
            maintype="application",
            subtype="pdf",
            filename=f"{invoice.invoice_number}.pdf",
        )

        if self.settings.smtp_use_tls:
            with SMTP(self.settings.smtp_host, self.settings.smtp_port, timeout=20) as server:
                server.starttls()
                if self.settings.smtp_username:
                    server.login(self.settings.smtp_username, self.settings.smtp_password or "")
                server.send_message(message)
        else:
            with SMTP_SSL(self.settings.smtp_host, self.settings.smtp_port, timeout=20) as server:
                if self.settings.smtp_username:
                    server.login(self.settings.smtp_username, self.settings.smtp_password or "")
                server.send_message(message)
