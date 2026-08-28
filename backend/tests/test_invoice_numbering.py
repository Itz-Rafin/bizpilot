from unittest.mock import Mock
from uuid import UUID

from app.infrastructure.database.repositories import SqlAlchemyInvoiceRepository

ORG = UUID("00000000-0000-0000-0000-000000000001")


def test_next_number_uses_highest_existing_number():
    db = Mock()
    db.scalar.side_effect = ["INV-00003"]
    db.execute.return_value = None

    repository = SqlAlchemyInvoiceRepository(db)

    assert repository.next_number(ORG) == "INV-00004"
