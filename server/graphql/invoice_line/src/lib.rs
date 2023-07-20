pub mod mutations;
use self::mutations::{inbound_shipment_line, outbound_shipment_line, prescription_line};
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
        input: outbound_shipment_line::line::insert::InsertInput,
    ) -> Result<outbound_shipment_line::line::insert::InsertResponse> {
        outbound_shipment_line::line::insert::insert(ctx, &store_id, input)
    }

    async fn update_outbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::line::update::UpdateInput,
    ) -> Result<outbound_shipment_line::line::update::UpdateResponse> {
        outbound_shipment_line::line::update::update(ctx, &store_id, input)
    }

    async fn delete_outbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::line::delete::DeleteInput,
    ) -> Result<outbound_shipment_line::line::delete::DeleteResponse> {
        outbound_shipment_line::line::delete::delete(ctx, &store_id, input)
    }

    async fn insert_outbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::service_line::insert::InsertInput,
    ) -> Result<outbound_shipment_line::service_line::insert::InsertResponse> {
        outbound_shipment_line::service_line::insert::insert(ctx, &store_id, input)
    }

    async fn update_outbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::service_line::update::UpdateInput,
    ) -> Result<outbound_shipment_line::service_line::update::UpdateResponse> {
        outbound_shipment_line::service_line::update::update(ctx, &store_id, input)
    }

    async fn delete_outbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::service_line::delete::DeleteInput,
    ) -> Result<outbound_shipment_line::service_line::delete::DeleteResponse> {
        outbound_shipment_line::service_line::delete::delete(ctx, &store_id, input)
    }

    async fn insert_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::unallocated_line::insert::InsertInput,
    ) -> Result<outbound_shipment_line::unallocated_line::insert::InsertResponse> {
        outbound_shipment_line::unallocated_line::insert::insert(ctx, &store_id, input)
    }

    async fn update_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::unallocated_line::update::UpdateInput,
    ) -> Result<outbound_shipment_line::unallocated_line::update::UpdateResponse> {
        outbound_shipment_line::unallocated_line::update::update(ctx, &store_id, input)
    }

    async fn delete_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: outbound_shipment_line::unallocated_line::delete::DeleteInput,
    ) -> Result<outbound_shipment_line::unallocated_line::delete::DeleteResponse> {
        outbound_shipment_line::unallocated_line::delete::delete(ctx, &store_id, input)
    }

    async fn allocate_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        line_id: String,
    ) -> Result<outbound_shipment_line::unallocated_line::allocate::AllocateResponse> {
        outbound_shipment_line::unallocated_line::allocate::allocate(ctx, &store_id, line_id)
    }

    // Inbound

    async fn insert_inbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::line::insert::InsertInput,
    ) -> Result<inbound_shipment_line::line::insert::InsertResponse> {
        inbound_shipment_line::line::insert::insert(ctx, &store_id, input)
    }

    async fn update_inbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::line::update::UpdateInput,
    ) -> Result<inbound_shipment_line::line::update::UpdateResponse> {
        inbound_shipment_line::line::update::update(ctx, &store_id, input)
    }

    async fn delete_inbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::line::delete::DeleteInput,
    ) -> Result<inbound_shipment_line::line::delete::DeleteResponse> {
        inbound_shipment_line::line::delete::delete(ctx, &store_id, input)
    }

    async fn insert_inbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::service_line::insert::InsertInput,
    ) -> Result<inbound_shipment_line::service_line::insert::InsertResponse> {
        inbound_shipment_line::service_line::insert::insert(ctx, &store_id, input)
    }

    async fn update_inbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::service_line::update::UpdateInput,
    ) -> Result<inbound_shipment_line::service_line::update::UpdateResponse> {
        inbound_shipment_line::service_line::update::update(ctx, &store_id, input)
    }

    async fn delete_inbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: inbound_shipment_line::service_line::delete::DeleteInput,
    ) -> Result<inbound_shipment_line::service_line::delete::DeleteResponse> {
        inbound_shipment_line::service_line::delete::delete(ctx, &store_id, input)
    }

    async fn insert_prescription_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: prescription_line::insert::InsertInput,
    ) -> Result<prescription_line::insert::InsertResponse> {
        prescription_line::insert::insert(ctx, &store_id, input)
    }

    async fn update_prescription_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: prescription_line::update::UpdateInput,
    ) -> Result<prescription_line::update::UpdateResponse> {
        prescription_line::update(ctx, &store_id, input)
    }

    async fn delete_prescription_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: prescription_line::delete::DeleteInput,
    ) -> Result<prescription_line::delete::DeleteResponse> {
        prescription_line::delete(ctx, &store_id, input)
    }
}
