from dataclasses import dataclass
from uuid import UUID

from app.domain.ports.repositories import CatalogRepository, ExpenseRepository, TenantContext


@dataclass(slots=True)
class CatalogUseCases:
    repository: CatalogRepository

    def list_products(self, tenant: TenantContext, search: str | None):
        return self.repository.list_products(tenant.organization_id, search)

    def create_product(self, tenant: TenantContext, values: dict):
        return self.repository.create_product(tenant.organization_id, values)

    def list_services(self, tenant: TenantContext, search: str | None):
        return self.repository.list_services(tenant.organization_id, search)

    def create_service(self, tenant: TenantContext, values: dict):
        return self.repository.create_service(tenant.organization_id, values)


@dataclass(slots=True)
class ExpenseUseCases:
    repository: ExpenseRepository

    def list(self, tenant: TenantContext, offset: int, limit: int):
        return self.repository.list_expenses(tenant.organization_id, offset, limit)

    def create(self, tenant: TenantContext, values: dict):
        if values["amount"] <= 0:
            raise ValueError("Expense amount must be greater than zero")
        return self.repository.create_expense(tenant.organization_id, values)

    def update(self, tenant: TenantContext, expense_id: UUID, values: dict):
        return self.repository.save_expense(tenant.organization_id, expense_id, values)

    def delete(self, tenant: TenantContext, expense_id: UUID) -> bool:
        return self.repository.delete_expense(tenant.organization_id, expense_id)
