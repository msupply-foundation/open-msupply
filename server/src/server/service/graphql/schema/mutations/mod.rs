use crate::server::service::graphql::schema::types::Requisition;

mod customer_invoice;
mod error;
mod requisition;

use customer_invoice::{
    DeleteCustomerInvoiceInput, DeleteCustomerInvoiceResultUnion, InsertCustomerInvoiceInput,
    InsertCustomerInvoiceResultUnion, UpdateCustomerInvoiceInput, UpdateCustomerInvoiceResultUnion,
};

use requisition::InsertRequisitionInput;

use async_graphql::{Context, Object};

pub struct Mutations;

#[Object]
impl Mutations {
    async fn insert_requisition(
        &self,
        ctx: &Context<'_>,
        input: InsertRequisitionInput,
    ) -> Requisition {
        requisition::insert_requisition(ctx, input).await
    }

    async fn insert_customer_invoice(
        &self,
        ctx: &Context<'_>,
        input: InsertCustomerInvoiceInput,
    ) -> InsertCustomerInvoiceResultUnion {
        customer_invoice::insert_customer_invoice(ctx, input).await
    }

    async fn update_customer_invoice(
        &self,
        ctx: &Context<'_>,
        input: UpdateCustomerInvoiceInput,
    ) -> UpdateCustomerInvoiceResultUnion {
        customer_invoice::update_customer_invoice(ctx, input).await
    }

    async fn delete_customer_invoice(
        &self,
        ctx: &Context<'_>,
        input: DeleteCustomerInvoiceInput,
    ) -> DeleteCustomerInvoiceResultUnion {
        customer_invoice::delete_customer_invoice(ctx, input).await
    }
}
