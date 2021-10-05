use crate::server::service::graphql::schema::types::Requisition;

mod requisition;

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
}
