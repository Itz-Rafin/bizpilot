from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def render_invoice_pdf(invoice, organization_name: str = "BizPilot") -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.6 * inch,
        leftMargin=0.6 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
    )
    styles = getSampleStyleSheet()
    story = [
        Paragraph(f"<b>{organization_name}</b>", styles["Title"]),
        Paragraph(f"Invoice {invoice.invoice_number}", styles["Heading2"]),
        Spacer(1, 0.2 * inch),
    ]
    rows = [["Description", "Qty", "Unit price", "Total"]]
    rows.extend(
        [
            [item.description, str(item.quantity), f"{item.unit_price:.2f}", f"{item.total:.2f}"]
            for item in invoice.items
        ]
    )
    rows.extend(
        [
            ["", "", "Subtotal", f"{invoice.subtotal:.2f}"],
            ["", "", "Tax", f"{invoice.tax:.2f}"],
            ["", "", "Discount", f"-{invoice.discount:.2f}"],
            ["", "", "Total", f"{invoice.total:.2f}"],
        ]
    )
    table = Table(rows, colWidths=[3.7 * inch, 0.6 * inch, 1.0 * inch, 1.0 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17202a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#dfe4eb")),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 0.25 * inch))
    story.append(
        Paragraph(
            f"Issue date: {invoice.issue_date} &nbsp;&nbsp; Due date: {invoice.due_date}",
            styles["BodyText"],
        )
    )
    if invoice.notes:
        story.append(Paragraph(invoice.notes, styles["BodyText"]))
    doc.build(story)
    return buffer.getvalue()
