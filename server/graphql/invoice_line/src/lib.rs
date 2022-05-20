pub mod mutations;
use self::mutations::{inbound_shipment_line, outbound_shipment_line};
use async_graphql::*;

#[derive(Default, Clone)]
pub struct InvoiceLineMutations;

#[Object]
impl InvoiceLineMutations {
    // Outbound
    async fn insert_outbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::line::InsertInput,
    ) -> Result<outbound_shipment_line::line::InsertResponse> {
        outbound_shipment_line::line::insert(ctx, &store_id, input)
    }

    async fn update_outbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::line::UpdateInput,
    ) -> Result<outbound_shipment_line::line::UpdateResponse> {
        outbound_shipment_line::line::update(ctx, &store_id, input)
    }

    async fn delete_outbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::line::DeleteInput,
    ) -> Result<outbound_shipment_line::line::DeleteResponse> {
        outbound_shipment_line::line::delete(ctx, &store_id, input)
    }

    async fn insert_outbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::service_line::InsertInput,
    ) -> Result<outbound_shipment_line::service_line::InsertResponse> {
        outbound_shipment_line::service_line::insert(ctx, &store_id, input)
    }

    async fn update_outbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::service_line::UpdateInput,
    ) -> Result<outbound_shipment_line::service_line::UpdateResponse> {
        outbound_shipment_line::service_line::update(ctx, &store_id, input)
    }

    async fn delete_outbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::service_line::DeleteInput,
    ) -> Result<outbound_shipment_line::service_line::DeleteResponse> {
        outbound_shipment_line::service_line::delete(ctx, &store_id, input)
    }

    async fn insert_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::unallocated_line::InsertInput,
    ) -> Result<outbound_shipment_line::unallocated_line::InsertResponse> {
        outbound_shipment_line::unallocated_line::insert(ctx, &store_id, input)
    }

    async fn update_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::unallocated_line::UpdateInput,
    ) -> Result<outbound_shipment_line::unallocated_line::UpdateResponse> {
        outbound_shipment_line::unallocated_line::update(ctx, &store_id, input)
    }

    async fn delete_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::unallocated_line::DeleteInput,
    ) -> Result<outbound_shipment_line::unallocated_line::DeleteResponse> {
        outbound_shipment_line::unallocated_line::delete(ctx, &store_id, input)
    }

    async fn allocate_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        line_id: String,
    ) -> Result<outbound_shipment_line::unallocated_line::AllocateResponse> {
        outbound_shipment_line::unallocated_line::allocate(ctx, &store_id, line_id)
    }

    // Inbound

    async fn insert_inbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::line::InsertInput,
    ) -> Result<inbound_shipment_line::line::InsertResponse> {
        inbound_shipment_line::line::insert(ctx, &store_id, input)
    }

    async fn update_inbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::line::UpdateInput,
    ) -> Result<inbound_shipment_line::line::UpdateResponse> {
        inbound_shipment_line::line::update(ctx, &store_id, input)
    }

    async fn delete_inbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::line::DeleteInput,
    ) -> Result<inbound_shipment_line::line::DeleteResponse> {
        inbound_shipment_line::line::delete(ctx, &store_id, input)
    }

    async fn insert_inbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::service_line::InsertInput,
    ) -> Result<inbound_shipment_line::service_line::InsertResponse> {
        inbound_shipment_line::service_line::insert(ctx, &store_id, input)
    }

    async fn update_inbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::service_line::UpdateInput,
    ) -> Result<inbound_shipment_line::service_line::UpdateResponse> {
        inbound_shipment_line::service_line::update(ctx, &store_id, input)
    }

    async fn delete_inbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::service_line::DeleteInput,
    ) -> Result<inbound_shipment_line::service_line::DeleteResponse> {
        inbound_shipment_line::service_line::delete(ctx, &store_id, input)
    }
}
