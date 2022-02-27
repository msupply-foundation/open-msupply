use async_graphql::*;
use graphql_batch_mutations::batch_stocktake::*;
use graphql_general_mutations::*;
use graphql_requisition::mutations::{request_requisition, response_requisition};
use graphql_requisition_line::mutations::{request_requisition_line, response_requisition_line};

#[derive(Default)]
pub struct Mutations;

#[Object]
impl Mutations {
    async fn register_user(
        &self,
        ctx: &Context<'_>,
        input: UserRegisterInput,
    ) -> UserRegisterResponse {
        user_register(ctx, input)
    }
    // async fn batch_inbound_shipment(
    //     &self,
    //     ctx: &Context<'_>,
    //     store_id: String,
    //     input: BatchInboundShipmentInput,
    // ) -> BatchInboundShipmentResponse {
    //     let connection_manager = ctx.get_connection_manager();

    //     get_batch_inbound_shipment_response(connection_manager, &store_id, input)
    // }

    // async fn batch_outbound_shipment(
    //     &self,
    //     ctx: &Context<'_>,
    //     store_id: String,
    //     input: BatchOutboundShipmentInput,
    // ) -> Result<BatchOutboundShipmentResponse> {
    //     get_batch_outbound_shipment_response(ctx, &store_id, input)
    // }

    async fn batch_stocktake(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: BatchStocktakeInput,
    ) -> Result<BatchStocktakeResponse> {
        batch_stocktake(ctx, &store_id, input)
    }

    async fn insert_request_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::InsertInput,
    ) -> Result<request_requisition::InsertResponse> {
        request_requisition::insert(ctx, &store_id, input)
    }

    async fn update_request_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::UpdateInput,
    ) -> Result<request_requisition::UpdateResponse> {
        request_requisition::update(ctx, &store_id, input)
    }

    async fn delete_request_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::DeleteInput,
    ) -> Result<request_requisition::DeleteResponse> {
        request_requisition::delete(ctx, &store_id, input)
    }

    /// Set requested for each line in request requisition to calculated
    async fn use_suggested_quantity(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::UseSuggestedQuantityInput,
    ) -> Result<request_requisition::UseSuggestedQuantityResponse> {
        request_requisition::use_suggested_quantity(ctx, &store_id, input)
    }

    /// Add requisition lines from master item master list
    async fn add_from_master_list(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::AddFromMasterListInput,
    ) -> Result<request_requisition::AddFromMasterListResponse> {
        request_requisition::add_from_master_list(ctx, &store_id, input)
    }

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

    async fn update_response_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: response_requisition::UpdateInput,
    ) -> Result<response_requisition::UpdateResponse> {
        response_requisition::update(ctx, &store_id, input)
    }

    async fn update_response_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: response_requisition_line::UpdateInput,
    ) -> Result<response_requisition_line::UpdateResponse> {
        response_requisition_line::update(ctx, &store_id, input)
    }

    /// Set supply quantity to requested quantity
    async fn supply_requested_quantity(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: response_requisition::SupplyRequestedQuantityInput,
    ) -> Result<response_requisition::SupplyRequestedQuantityResponse> {
        response_requisition::supply_requested_quantity(ctx, &store_id, input)
    }

    /// Create shipment for response requisition
    /// Will create Outbound Shipment with placeholder lines for each requisition line
    /// placeholder line quantity will be set to requisitionLine.supply - all linked outbound shipments
    /// lines quantity (placeholder and filled) for requisitionLine.item
    async fn create_requisition_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: response_requisition::CreateRequisitionShipmentInput,
    ) -> Result<response_requisition::CreateRequisitionShipmentResponse> {
        response_requisition::create_requisition_shipment(ctx, &store_id, input)
    }
}
