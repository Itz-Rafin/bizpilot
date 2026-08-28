from unittest.mock import Mock
from uuid import UUID

import pytest

from app.infrastructure.database.operations_repositories import SqlAlchemyExpenseRepository

ORG = UUID("00000000-0000-0000-0000-000000000001")
OTHER_CATEGORY = UUID("00000000-0000-0000-0000-000000000021")


def test_rejects_expense_category_from_other_company():
    db = Mock()
    db.scalar.return_value = None
    repository = SqlAlchemyExpenseRepository(db)

    with pytest.raises(ValueError, match="Expense category does not belong"):
        repository.create_expense(
            ORG,
            {
                "category_id": OTHER_CATEGORY,
                "description": "Test expense",
                "amount": 10,
            },
        )


def test_allows_expense_without_category():
    db = Mock()
    db.scalar.return_value = object()
    db.add = Mock()
    db.commit = Mock()
    db.refresh = Mock()
    repository = SqlAlchemyExpenseRepository(db)

    result = repository.create_expense(
        ORG,
        {"category_id": None, "description": "Test expense", "amount": 10},
    )

    assert result is not None
    db.scalar.assert_not_called()
