pub mod mutations;
use self::mutations::{
    request_requisition_line::{delete::*, insert::*, update::*},
    response_requisition_line,
};
use async_graphql::*;
#[derive(Default, Clone)]
pub struct RequisitionLineMutations;

#[Object]
impl RequisitionLineMutations {
    async fn insert_request_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertInput,
    ) -> Result<InsertResponse> {
        insert(ctx, &store_id, input)
    }

    async fn update_request_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateInput,
    ) -> Result<UpdateResponse> {
        update(ctx, &store_id, input)
    }

    async fn delete_request_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteInput,
    ) -> Result<DeleteResponse> {
        delete(ctx, &store_id, input)
    }

    async fn insert_response_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: response_requisition_line::InsertInput,
    ) -> Result<response_requisition_line::InsertResponse> {
        response_requisition_line::insert(ctx, &store_id, input)
    }

    async fn update_response_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: response_requisition_line::UpdateInput,
    ) -> Result<response_requisition_line::UpdateResponse> {
        response_requisition_line::update(ctx, &store_id, input)
    }

    async fn delete_response_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: response_requisition_line::delete::DeleteInput,
    ) -> Result<response_requisition_line::delete::DeleteResponse> {
        response_requisition_line::delete::delete(ctx, &store_id, input)
    }
}
