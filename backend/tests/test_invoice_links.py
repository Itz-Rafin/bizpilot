from types import SimpleNamespace
from unittest.mock import Mock
from uuid import UUID

import pytest

from app.presentation.api.v1.invoices import validate_invoice_links

ORG = UUID("00000000-0000-0000-0000-000000000001")
CUSTOMER = UUID("00000000-0000-0000-0000-000000000011")
PRODUCT = UUID("00000000-0000-0000-0000-000000000021")
SERVICE = UUID("00000000-0000-0000-0000-000000000031")


def make_invoice(items=None):
    return SimpleNamespace(customer_id=str(CUSTOMER), items=items or [])


def test_rejects_customer_that_is_not_in_company():
    db = Mock()
    db.scalar.return_value = None

    with pytest.raises(ValueError, match="Customer does not belong"):
        validate_invoice_links(db, ORG, make_invoice())


def test_rejects_product_that_is_not_in_company():
    db = Mock()
    db.scalar.side_effect = [object(), None]
    item = SimpleNamespace(product_id=str(PRODUCT), service_id=None)

    with pytest.raises(ValueError, match="Product does not belong"):
        validate_invoice_links(db, ORG, make_invoice([item]))


def test_rejects_service_that_is_not_in_company():
    db = Mock()
    db.scalar.side_effect = [object(), object(), None]
    item = SimpleNamespace(product_id=str(PRODUCT), service_id=str(SERVICE))

    with pytest.raises(ValueError, match="Service does not belong"):
        validate_invoice_links(db, ORG, make_invoice([item]))


def test_accepts_links_from_same_company():
    db = Mock()
    db.scalar.side_effect = [object(), object(), object()]
    item = SimpleNamespace(product_id=str(PRODUCT), service_id=str(SERVICE))

    validate_invoice_links(db, ORG, make_invoice([item]))
