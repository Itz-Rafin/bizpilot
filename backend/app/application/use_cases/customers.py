from dataclasses import dataclass
from uuid import UUID

from app.domain.ports.repositories import CustomerRepository, TenantContext


@dataclass(slots=True)
class CustomerUseCases:
    repository: CustomerRepository

    def list(self, tenant: TenantContext, search: str | None, offset: int, limit: int):
        return self.repository.list(tenant.organization_id, search, offset, limit)

    def get(self, tenant: TenantContext, customer_id: UUID):
        return self.repository.get(tenant.organization_id, customer_id)

    def create(self, tenant: TenantContext, values: dict):
        return self.repository.create(tenant.organization_id, values)

    def update(self, tenant: TenantContext, customer_id: UUID, values: dict):
        return self.repository.update(tenant.organization_id, customer_id, values)

    def archive(self, tenant: TenantContext, customer_id: UUID) -> bool:
        return self.repository.archive(tenant.organization_id, customer_id)
