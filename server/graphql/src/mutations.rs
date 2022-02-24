use async_graphql::*;
use graphql_batch_mutations::{
    batch_inbound_shipment::*, batch_outbound_shipment::*, batch_stocktake::*,
};
use graphql_core::ContextExt;
use graphql_general_mutations::*;
use graphql_invoice::mutations::{inbound_shipment::*, outbound_shipment::*};
use graphql_invoice_line::mutations::{inbound_shipment_line::*, outbound_shipment_line::*};
use graphql_location::mutations::*;
use graphql_requisition::mutations::{request_requisition, response_requisition};
use graphql_requisition_line::mutations::{request_requisition_line, response_requisition_line};
use graphql_stocktake::mutations::{delete::*, insert::*, update::*};
use graphql_stocktake_line::mutations::{delete::*, insert::*, update::*};
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

    async fn insert_location(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertLocationInput,
    ) -> InsertLocationResponse {
        insert_location(ctx, &store_id, input)
    }

    async fn update_location(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateLocationInput,
    ) -> UpdateLocationResponse {
        update_location(ctx, &store_id, input)
    }

    async fn delete_location(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteLocationInput,
    ) -> DeleteLocationResponse {
        delete_location(ctx, &store_id, input)
    }

    async fn insert_outbound_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertOutboundShipmentInput,
    ) -> InsertOutboundShipmentResponse {
        let connection_manager = ctx.get_connection_manager();
        get_insert_outbound_shipment_response(connection_manager, &store_id, input)
    }

    async fn update_outbound_shipment(
        &self,
        ctx: &Context<'_>,
        input: UpdateOutboundShipmentInput,
    ) -> UpdateOutboundShipmentResponse {
        let connection_manager = ctx.get_connection_manager();
        get_update_outbound_shipment_response(connection_manager, input)
    }

    async fn delete_outbound_shipment(
        &self,
        ctx: &Context<'_>,
        id: String,
    ) -> DeleteOutboundShipmentResponse {
        let connection_manager = ctx.get_connection_manager();
        get_delete_outbound_shipment_response(connection_manager, id)
    }

    async fn insert_outbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        input: InsertOutboundShipmentLineInput,
    ) -> InsertOutboundShipmentLineResponse {
        let connection_manager = ctx.get_connection_manager();
        get_insert_outbound_shipment_line_response(connection_manager, input)
    }

    async fn update_outbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        input: UpdateOutboundShipmentLineInput,
    ) -> UpdateOutboundShipmentLineResponse {
        let connection_manager = ctx.get_connection_manager();
        get_update_outbound_shipment_line_response(connection_manager, input)
    }

    async fn delete_outbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        input: DeleteOutboundShipmentLineInput,
    ) -> DeleteOutboundShipmentLineResponse {
        let connection_manager = ctx.get_connection_manager();
        get_delete_outbound_shipment_line_response(connection_manager, input)
    }

    async fn insert_outbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        input: InsertOutboundShipmentServiceLineInput,
    ) -> InsertOutboundShipmentServiceLineResponse {
        let connection_manager = ctx.get_connection_manager();
        get_insert_outbound_shipment_service_line_response(connection_manager, input)
    }

    async fn update_outbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        input: UpdateOutboundShipmentServiceLineInput,
    ) -> UpdateOutboundShipmentServiceLineResponse {
        let connection_manager = ctx.get_connection_manager();
        get_update_outbound_shipment_service_line_response(connection_manager, input)
    }

    async fn delete_outbound_shipment_service_line(
        &self,
        ctx: &Context<'_>,
        input: DeleteOutboundShipmentServiceLineInput,
    ) -> DeleteOutboundShipmentServiceLineResponse {
        let connection_manager = ctx.get_connection_manager();
        get_delete_outbound_shipment_service_line_response(connection_manager, input)
    }

    async fn insert_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        input: unallocated_line::InsertInput,
    ) -> Result<unallocated_line::InsertResponse> {
        unallocated_line::insert(ctx, input)
    }

    async fn update_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        input: unallocated_line::UpdateInput,
    ) -> Result<unallocated_line::UpdateResponse> {
        unallocated_line::update(ctx, input)
    }

    async fn delete_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        input: unallocated_line::DeleteInput,
    ) -> Result<unallocated_line::DeleteResponse> {
        unallocated_line::delete(ctx, input)
    }

    async fn insert_inbound_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertInboundShipmentInput,
    ) -> InsertInboundShipmentResponse {
        let connection_manager = ctx.get_connection_manager();
        get_insert_inbound_shipment_response(connection_manager, &store_id, input)
    }

    async fn update_inbound_shipment(
        &self,
        ctx: &Context<'_>,
        input: UpdateInboundShipmentInput,
    ) -> UpdateInboundShipmentResponse {
        let connection_manager = ctx.get_connection_manager();
        get_update_inbound_shipment_response(connection_manager, input)
    }

    async fn delete_inbound_shipment(
        &self,
        ctx: &Context<'_>,
        input: DeleteInboundShipmentInput,
    ) -> DeleteInboundShipmentResponse {
        let connection_manager = ctx.get_connection_manager();
        get_delete_inbound_shipment_response(connection_manager, input)
    }

    async fn insert_inbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        input: InsertInboundShipmentLineInput,
    ) -> InsertInboundShipmentLineResponse {
        let connection_manager = ctx.get_connection_manager();
        get_insert_inbound_shipment_line_response(connection_manager, input)
    }

    async fn update_inbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        input: UpdateInboundShipmentLineInput,
    ) -> UpdateInboundShipmentLineResponse {
        let connection_manager = ctx.get_connection_manager();
        get_update_inbound_shipment_line_response(connection_manager, input)
    }

    async fn delete_inbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        input: DeleteInboundShipmentLineInput,
    ) -> DeleteInboundShipmentLineResponse {
        let connection_manager = ctx.get_connection_manager();
        get_delete_inbound_shipment_line_response(connection_manager, input)
    }

    async fn batch_inbound_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: BatchInboundShipmentInput,
    ) -> BatchInboundShipmentResponse {
        let connection_manager = ctx.get_connection_manager();

        get_batch_inbound_shipment_response(connection_manager, &store_id, input)
    }

    async fn batch_outbound_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: BatchOutboundShipmentInput,
    ) -> Result<BatchOutboundShipmentResponse> {
        get_batch_outbound_shipment_response(ctx, &store_id, input)
    }

    async fn insert_stocktake(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertStocktakeInput,
    ) -> Result<InsertStocktakeResponse> {
        insert_stocktake(ctx, &store_id, input)
    }

    async fn update_stocktake(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateStocktakeInput,
    ) -> Result<UpdateStocktakeResponse> {
        update_stocktake(ctx, &store_id, input)
    }

    async fn delete_stocktake(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteStocktakeInput,
    ) -> Result<DeleteStocktakeResponse> {
        delete_stocktake(ctx, &store_id, input)
    }

    async fn insert_stocktake_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertStocktakeLineInput,
    ) -> Result<InsertStocktakeLineResponse> {
        insert_stocktake_line(ctx, &store_id, input)
    }

    async fn update_stocktake_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateStocktakeLineInput,
    ) -> Result<UpdateStocktakeLineResponse> {
        update_stocktake_line(ctx, &store_id, input)
    }

    async fn delete_stocktake_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteStocktakeLineInput,
    ) -> Result<DeleteStocktakeLineResponse> {
        delete_stocktake_line(ctx, &store_id, input)
    }

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
