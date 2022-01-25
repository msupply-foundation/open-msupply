mod error;

pub mod inbound_shipment;
pub mod location;
pub mod outbound_shipment;
pub mod requisition;
pub mod stock_take;
pub mod tax_update_input;
pub mod user_register;

use self::{
    location::{
        delete_location, insert_location, update_location, DeleteLocationInput,
        DeleteLocationResponse, InsertLocationInput, InsertLocationResponse, UpdateLocationInput,
        UpdateLocationResponse,
    },
    stock_take::{
        delete::{delete_stock_take, DeleteStockTakeInput, DeleteStockTakeResponse},
        insert::{insert_stock_take, InsertStockTakeInput, InsertStockTakeResponse},
        line::{
            delete::{
                delete_stock_take_line, DeleteStockTakeLineInput, DeleteStockTakeLineResponse,
            },
            insert::{
                insert_stock_take_line, InsertStockTakeLineInput, InsertStockTakeLineResponse,
            },
            update::{
                update_stock_take_line, UpdateStockTakeLineInput, UpdateStockTakeLineResponse,
            },
        },
        update::{update_stock_take, UpdateStockTakeInput, UpdateStockTakeResponse},
    },
};

use super::{
    queries::invoice::*,
    types::{Connector, InvoiceLineNode},
};
use crate::ContextExt;
use async_graphql::*;
use inbound_shipment::*;
use outbound_shipment::*;
use requisition::*;
use service::current_store_id;
pub use user_register::*;

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
        input: InsertLocationInput,
    ) -> InsertLocationResponse {
        insert_location(ctx, input)
    }

    async fn update_location(
        &self,
        ctx: &Context<'_>,
        input: UpdateLocationInput,
    ) -> UpdateLocationResponse {
        update_location(ctx, input)
    }

    async fn delete_location(
        &self,
        ctx: &Context<'_>,
        input: DeleteLocationInput,
    ) -> DeleteLocationResponse {
        delete_location(ctx, input)
    }

    async fn insert_outbound_shipment(
        &self,
        ctx: &Context<'_>,
        input: InsertOutboundShipmentInput,
    ) -> InsertOutboundShipmentResponse {
        let connection_manager = ctx.get_connection_manager();
        get_insert_outbound_shipment_response(connection_manager, input)
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
        input: outbound_shipment::unallocated_line::InsertInput,
    ) -> Result<outbound_shipment::unallocated_line::InsertResponse> {
        outbound_shipment::unallocated_line::insert(ctx, input)
    }

    async fn update_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        input: outbound_shipment::unallocated_line::UpdateInput,
    ) -> Result<outbound_shipment::unallocated_line::UpdateResponse> {
        outbound_shipment::unallocated_line::update(ctx, input)
    }

    async fn delete_outbound_shipment_unallocated_line(
        &self,
        ctx: &Context<'_>,
        input: outbound_shipment::unallocated_line::DeleteInput,
    ) -> Result<outbound_shipment::unallocated_line::DeleteResponse> {
        outbound_shipment::unallocated_line::delete(ctx, input)
    }

    async fn insert_inbound_shipment(
        &self,
        ctx: &Context<'_>,
        input: InsertInboundShipmentInput,
    ) -> InsertInboundShipmentResponse {
        let connection_manager = ctx.get_connection_manager();
        get_insert_inbound_shipment_response(connection_manager, input)
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
        insert_inbound_shipments: Option<Vec<InsertInboundShipmentInput>>,
        insert_inbound_shipment_lines: Option<Vec<InsertInboundShipmentLineInput>>,
        update_inbound_shipment_lines: Option<Vec<UpdateInboundShipmentLineInput>>,
        delete_inbound_shipment_lines: Option<Vec<DeleteInboundShipmentLineInput>>,
        update_inbound_shipments: Option<Vec<UpdateInboundShipmentInput>>,
        delete_inbound_shipments: Option<Vec<DeleteInboundShipmentInput>>,
    ) -> BatchInboundShipmentResponse {
        let connection_manager = ctx.get_connection_manager();

        get_batch_inbound_shipment_response(
            connection_manager,
            insert_inbound_shipments,
            insert_inbound_shipment_lines,
            update_inbound_shipment_lines,
            delete_inbound_shipment_lines,
            update_inbound_shipments,
            delete_inbound_shipments,
        )
    }

    async fn batch_outbound_shipment(
        &self,
        ctx: &Context<'_>,
        insert_outbound_shipments: Option<Vec<InsertOutboundShipmentInput>>,
        insert_outbound_shipment_lines: Option<Vec<InsertOutboundShipmentLineInput>>,
        update_outbound_shipment_lines: Option<Vec<UpdateOutboundShipmentLineInput>>,
        delete_outbound_shipment_lines: Option<Vec<DeleteOutboundShipmentLineInput>>,
        insert_outbound_shipment_service_lines: Option<Vec<InsertOutboundShipmentServiceLineInput>>,
        update_outbound_shipment_service_lines: Option<Vec<UpdateOutboundShipmentServiceLineInput>>,
        delete_outbound_shipment_service_lines: Option<Vec<DeleteOutboundShipmentServiceLineInput>>,
        update_outbound_shipments: Option<Vec<UpdateOutboundShipmentInput>>,
        delete_outbound_shipments: Option<Vec<String>>,
    ) -> BatchOutboundShipmentResponse {
        let connection_manager = ctx.get_connection_manager();

        get_batch_outbound_shipment_response(
            connection_manager,
            insert_outbound_shipments,
            insert_outbound_shipment_lines,
            update_outbound_shipment_lines,
            delete_outbound_shipment_lines,
            insert_outbound_shipment_service_lines,
            update_outbound_shipment_service_lines,
            delete_outbound_shipment_service_lines,
            update_outbound_shipments,
            delete_outbound_shipments,
        )
    }

    async fn insert_stock_take(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: InsertStockTakeInput,
    ) -> Result<InsertStockTakeResponse> {
        // TODO remove and make store_id parameter required
        let store_id = store_id.unwrap_or(current_store_id(
            &ctx.get_connection_manager().connection()?,
        )?);
        insert_stock_take(ctx, &store_id, input)
    }

    async fn update_stock_take(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: UpdateStockTakeInput,
    ) -> Result<UpdateStockTakeResponse> {
        // TODO remove and make store_id parameter required
        let store_id = store_id.unwrap_or(current_store_id(
            &ctx.get_connection_manager().connection()?,
        )?);
        update_stock_take(ctx, &store_id, input)
    }

    async fn delete_stock_take(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: DeleteStockTakeInput,
    ) -> Result<DeleteStockTakeResponse> {
        // TODO remove and make store_id parameter required
        let store_id = store_id.unwrap_or(current_store_id(
            &ctx.get_connection_manager().connection()?,
        )?);
        delete_stock_take(ctx, &store_id, input)
    }

    async fn insert_stock_take_line(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: InsertStockTakeLineInput,
    ) -> Result<InsertStockTakeLineResponse> {
        // TODO remove and make store_id parameter required
        let store_id = store_id.unwrap_or(current_store_id(
            &ctx.get_connection_manager().connection()?,
        )?);
        insert_stock_take_line(ctx, &store_id, input)
    }

    async fn update_stock_take_line(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: UpdateStockTakeLineInput,
    ) -> Result<UpdateStockTakeLineResponse> {
        // TODO remove and make store_id parameter required
        let store_id = store_id.unwrap_or(current_store_id(
            &ctx.get_connection_manager().connection()?,
        )?);
        update_stock_take_line(ctx, &store_id, input)
    }

    async fn delete_stock_take_line(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: DeleteStockTakeLineInput,
    ) -> Result<DeleteStockTakeLineResponse> {
        // TODO remove and make store_id parameter required
        let store_id = store_id.unwrap_or(current_store_id(
            &ctx.get_connection_manager().connection()?,
        )?);
        delete_stock_take_line(ctx, &store_id, &input)
    }

    async fn insert_request_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: request_requisition::InsertInput,
    ) -> Result<request_requisition::InsertResponse> {
        // TODO remove and make store_id parameter required
        request_requisition::insert(ctx, store_id, input)
    }

    async fn update_request_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: request_requisition::UpdateInput,
    ) -> Result<request_requisition::UpdateResponse> {
        // TODO remove and make store_id parameter required
        request_requisition::update(ctx, store_id, input)
    }

    async fn delete_request_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: request_requisition::DeleteInput,
    ) -> Result<request_requisition::DeleteResponse> {
        // TODO remove and make store_id parameter required
        request_requisition::delete(ctx, store_id, input)
    }

    /// Set requested for each line in request requisition to calculated
    async fn use_calculated_quantity(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: request_requisition::UseCalculatedQuantityInput,
    ) -> Result<request_requisition::UseCalculatedQuantityResponse> {
        // TODO remove and make store_id parameter required
        request_requisition::use_calculated_quantity(ctx, store_id, input)
    }

    /// Add i
    async fn add_from_master_list(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: request_requisition::AddFromMasterListInput,
    ) -> Result<request_requisition::AddFromMasterListResponse> {
        // TODO remove and make store_id parameter required
        request_requisition::add_from_master_list(ctx, store_id, input)
    }

    async fn insert_request_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: request_requisition::line::InsertInput,
    ) -> Result<request_requisition::line::InsertResponse> {
        // TODO remove and make store_id parameter required
        request_requisition::line::insert(ctx, store_id, input)
    }

    async fn update_request_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: request_requisition::line::UpdateInput,
    ) -> Result<request_requisition::line::UpdateResponse> {
        // TODO remove and make store_id parameter required
        request_requisition::line::update(ctx, store_id, input)
    }

    async fn delete_request_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: request_requisition::line::DeleteInput,
    ) -> Result<request_requisition::line::DeleteResponse> {
        // TODO remove and make store_id parameter required
        request_requisition::line::delete(ctx, store_id, input)
    }

    async fn update_response_requisition(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: response_requisition::UpdateInput,
    ) -> Result<response_requisition::UpdateResponse> {
        // TODO remove and make store_id parameter required
        response_requisition::update(ctx, store_id, input)
    }

    async fn update_response_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: response_requisition::line::UpdateInput,
    ) -> Result<response_requisition::line::UpdateResponse> {
        // TODO remove and make store_id parameter required
        response_requisition::line::update(ctx, store_id, input)
    }

    /// Set supply quantity to requested quantity
    async fn supply_requested_quantity(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: response_requisition::SupplyRequestedQuantityInput,
    ) -> Result<response_requisition::SupplyRequestedQuantityResponse> {
        // TODO remove and make store_id parameter required
        response_requisition::supply_requested_quantity(ctx, store_id, input)
    }

    /// Create shipment for response requisition
    /// Will create Outbound Shipment with placeholder lines for each requisition line
    /// placeholder line quantity will be set to requisitionLine.supply - all linked outbound shipments
    /// lines quantity (placeholder and filled) for requistionLine.item
    async fn create_requisition_shipment(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
        input: response_requisition::CreateRequisitionShipmentInput,
    ) -> Result<response_requisition::CreateRequisitionShipmentResponse> {
        // TODO remove and make store_id parameter required
        response_requisition::create_requisition_shipment(ctx, store_id, input)
    }
}

// Common Mutation Errors
#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum ForeignKey {
    OtherPartyId,
    ItemId,
    InvoiceId,
    StockLineId,
    LocationId,
    RequisitionId,
}

pub struct ForeignKeyError(ForeignKey);
#[Object]
impl ForeignKeyError {
    pub async fn description(&self) -> &'static str {
        "FK record doesn't exist"
    }

    pub async fn key(&self) -> ForeignKey {
        self.0
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum UniqueValueKey {
    Code,
}

pub struct UniqueValueViolation(UniqueValueKey);
#[Object]
impl UniqueValueViolation {
    pub async fn description(&self) -> &'static str {
        "Field needs to be unique"
    }

    pub async fn field(&self) -> UniqueValueKey {
        self.0
    }
}

pub struct RecordDoesNotExist;
#[Object]
impl RecordDoesNotExist {
    pub async fn description(&self) -> &'static str {
        "Record does not exist"
    }
}

pub struct RecordAlreadyExist;
#[Object]
impl RecordAlreadyExist {
    pub async fn description(&self) -> &'static str {
        "Record already exists"
    }
}

pub struct RecordBelongsToAnotherStore;
#[Object]
impl RecordBelongsToAnotherStore {
    pub async fn description(&self) -> &'static str {
        "Record belongs to another store"
    }
}

pub struct CannotEditInvoice;
#[Object]
impl CannotEditInvoice {
    pub async fn description(&self) -> &'static str {
        "Cannot edit invoice"
    }
}

pub struct NotAnInboundShipment;
#[Object]
impl NotAnInboundShipment {
    pub async fn description(&self) -> &'static str {
        "Invoice is not Inbound Shipment"
    }
}

pub struct NotAnOutboundShipment;
#[Object]
impl NotAnOutboundShipment {
    pub async fn description(&self) -> &'static str {
        "Invoice is not Outbound Shipment"
    }
}

pub struct CannotDeleteInvoiceWithLines(pub Connector<InvoiceLineNode>);
#[Object]
impl CannotDeleteInvoiceWithLines {
    pub async fn description(&self) -> &'static str {
        "Cannot delete invoice with existing lines"
    }

    pub async fn lines(&self) -> &Connector<InvoiceLineNode> {
        &self.0
    }
}

pub struct InvoiceDoesNotBelongToCurrentStore;
#[Object]
impl InvoiceDoesNotBelongToCurrentStore {
    pub async fn description(&self) -> &'static str {
        "Invoice does not belong to current store"
    }
}

pub struct CannotReverseInvoiceStatus;
#[Object]
impl CannotReverseInvoiceStatus {
    pub async fn description(&self) -> &'static str {
        "Cannot reverse invoice status"
    }
}

pub struct DeleteResponse(String);
#[Object]
impl DeleteResponse {
    pub async fn id(&self) -> &str {
        &self.0
    }
}

pub struct InvoiceLineBelongsToAnotherInvoice(String);
#[Object]
impl InvoiceLineBelongsToAnotherInvoice {
    pub async fn description(&self) -> &'static str {
        "Invoice line belongs to another invoice"
    }

    pub async fn invoice(&self, ctx: &Context<'_>) -> InvoiceResponse {
        let connection_manager = ctx.get_connection_manager();

        get_invoice(connection_manager, self.0.clone())
    }
}

#[derive(SimpleObject)]
#[graphql(concrete(
    name = "InsertInboundShipmentResponseWithId",
    params(InsertInboundShipmentResponse)
))]
#[graphql(concrete(
    name = "UpdateInboundShipmentResponseWithId",
    params(UpdateInboundShipmentResponse)
))]
#[graphql(concrete(
    name = "DeleteInboundShipmentResponseWithId",
    params(DeleteInboundShipmentResponse)
))]
#[graphql(concrete(
    name = "InsertInboundShipmentLineResponseWithId",
    params(InsertInboundShipmentLineResponse)
))]
#[graphql(concrete(
    name = "UpdateInboundShipmentLineResponseWithId",
    params(UpdateInboundShipmentLineResponse)
))]
#[graphql(concrete(
    name = "DeleteInboundShipmentLineResponseWithId",
    params(DeleteInboundShipmentLineResponse)
))]
#[graphql(concrete(
    name = "InsertOutboundShipmentResponseWithId",
    params(InsertOutboundShipmentResponse)
))]
#[graphql(concrete(
    name = "UpdateOutboundShipmentResponseWithId",
    params(UpdateOutboundShipmentResponse)
))]
#[graphql(concrete(
    name = "DeleteOutboundShipmentResponseWithId",
    params(DeleteOutboundShipmentResponse)
))]
#[graphql(concrete(
    name = "InsertOutboundShipmentLineResponseWithId",
    params(InsertOutboundShipmentLineResponse)
))]
#[graphql(concrete(
    name = "UpdateOutboundShipmentLineResponseWithId",
    params(UpdateOutboundShipmentLineResponse)
))]
#[graphql(concrete(
    name = "DeleteOutboundShipmentLineResponseWithId",
    params(DeleteOutboundShipmentLineResponse)
))]
#[graphql(concrete(
    name = "InsertOutboundShipmentServiceLineResponseWithId",
    params(InsertOutboundShipmentServiceLineResponse)
))]
#[graphql(concrete(
    name = "UpdateOutboundShipmentServiceLineResponseWithId",
    params(UpdateOutboundShipmentServiceLineResponse)
))]
#[graphql(concrete(
    name = "DeleteOutboundShipmentServiceLineResponseWithId",
    params(DeleteOutboundShipmentServiceLineResponse)
))]
#[graphql(concrete(
    name = "DeleteStockTakeLineResponseWithId",
    params(DeleteStockTakeLineResponse)
))]
pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}
