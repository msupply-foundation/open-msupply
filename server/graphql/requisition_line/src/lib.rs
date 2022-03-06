pub mod mutations;
use self::mutations::{request_requisition_line, response_requisition_line};
use async_graphql::*;
#[derive(Default, Clone)]
pub struct RequisitionLineMutations;

#[Object]
impl RequisitionLineMutations {
    async fn insert_request_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition_line::InsertInput,
    ) -> Result<request_requisition_line::InsertResponse> {
        request_requisition_line::insert(ctx, &store_id, input)
    }

    async fn update_request_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition_line::UpdateInput,
    ) -> Result<request_requisition_line::UpdateResponse> {
        request_requisition_line::update(ctx, &store_id, input)
    }

    async fn delete_request_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition_line::DeleteInput,
    ) -> Result<request_requisition_line::DeleteResponse> {
        request_requisition_line::delete(ctx, &store_id, input)
    }

    async fn update_response_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: response_requisition_line::UpdateInput,
    ) -> Result<response_requisition_line::UpdateResponse> {
        response_requisition_line::update(ctx, &store_id, input)
    }
}
