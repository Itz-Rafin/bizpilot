from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.database.models import ExpenseModel, ProductModel, ServiceModel


class SqlAlchemyCatalogRepository:
    def __init__(self, session: Session):
        self.session = session

    def list_products(self, organization_id, search):
        query = select(ProductModel).where(
            ProductModel.organization_id == organization_id, ProductModel.status == "active"
        )
        if search:
            query = query.where(ProductModel.name.ilike(f"%{search.strip()}%"))
        return self.session.scalars(query.order_by(ProductModel.name).limit(100)).all()

    def create_product(self, organization_id, values):
        item = ProductModel(organization_id=organization_id, **values)
        self.session.add(item)
        self.session.commit()
        self.session.refresh(item)
        return item

    def list_services(self, organization_id, search):
        query = select(ServiceModel).where(
            ServiceModel.organization_id == organization_id, ServiceModel.status == "active"
        )
        if search:
            query = query.where(ServiceModel.name.ilike(f"%{search.strip()}%"))
        return self.session.scalars(query.order_by(ServiceModel.name).limit(100)).all()

    def create_service(self, organization_id, values):
        item = ServiceModel(organization_id=organization_id, **values)
        self.session.add(item)
        self.session.commit()
        self.session.refresh(item)
        return item


class SqlAlchemyExpenseRepository:
    def __init__(self, session: Session):
        self.session = session

    def list_expenses(self, organization_id, offset, limit):
        return self.session.scalars(
            select(ExpenseModel)
            .where(ExpenseModel.organization_id == organization_id)
            .order_by(ExpenseModel.expense_date.desc())
            .offset(offset)
            .limit(limit)
        ).all()

    def create_expense(self, organization_id, values):
        item = ExpenseModel(organization_id=organization_id, **values)
        self.session.add(item)
        self.session.commit()
        self.session.refresh(item)
        return item

    def get_expense(self, organization_id, expense_id):
        return self.session.scalar(
            select(ExpenseModel).where(
                ExpenseModel.id == expense_id, ExpenseModel.organization_id == organization_id
            )
        )

    def save_expense(self, organization_id, expense_id, values):
        item = self.get_expense(organization_id, expense_id)
        if item is None:
            return None
        for key, value in values.items():
            setattr(item, key, value)
        self.session.commit()
        self.session.refresh(item)
        return item

    def delete_expense(self, organization_id, expense_id):
        item = self.get_expense(organization_id, expense_id)
        if item is None:
            return False
        self.session.delete(item)
        self.session.commit()
        return True
