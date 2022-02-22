pub mod inbound_shipment;
pub mod location;
pub mod outbound_shipment;
pub mod requisition;
pub mod stocktake;
pub mod tax_update_input;
pub mod user_register;

use self::{
    location::{
        delete_location, insert_location, update_location, DeleteLocationInput,
        DeleteLocationResponse, InsertLocationInput, InsertLocationResponse, UpdateLocationInput,
        UpdateLocationResponse,
    },
    stocktake::{
        batch::{batch_stocktake, BatchStocktakeInput, BatchStocktakeResponse},
        delete::{delete_stocktake, DeleteStocktakeInput, DeleteStocktakeResponse},
        insert::{insert_stocktake, InsertStocktakeInput, InsertStocktakeResponse},
        line::{
            delete::{
                delete_stocktake_line, DeleteStocktakeLineInput, DeleteStocktakeLineResponse,
            },
            insert::{
                insert_stocktake_line, InsertStocktakeLineInput, InsertStocktakeLineResponse,
            },
            update::{
                update_stocktake_line, UpdateStocktakeLineInput, UpdateStocktakeLineResponse,
            },
        },
        update::{update_stocktake, UpdateStocktakeInput, UpdateStocktakeResponse},
    },
};

use super::{
    queries::invoice::*,
    types::{Connector, InvoiceLineNode, NameNode},
};
use crate::ContextExt;
use async_graphql::*;
use inbound_shipment::*;
use outbound_shipment::*;
use requisition::*;
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
        input: request_requisition::line::InsertInput,
    ) -> Result<request_requisition::line::InsertResponse> {
        request_requisition::line::insert(ctx, &store_id, input)
    }

    async fn update_request_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::line::UpdateInput,
    ) -> Result<request_requisition::line::UpdateResponse> {
        request_requisition::line::update(ctx, &store_id, input)
    }

    async fn delete_request_requisition_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: request_requisition::line::DeleteInput,
    ) -> Result<request_requisition::line::DeleteResponse> {
        request_requisition::line::delete(ctx, &store_id, input)
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
        input: response_requisition::line::UpdateInput,
    ) -> Result<response_requisition::line::UpdateResponse> {
        response_requisition::line::update(ctx, &store_id, input)
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

        get_invoice(connection_manager, None, self.0.clone())
    }
}

pub struct OtherPartyNotASupplier(NameNode);
#[Object]
impl OtherPartyNotASupplier {
    pub async fn description(&self) -> &'static str {
        "Other party name is not a supplier"
    }

    pub async fn other_party(&self) -> &NameNode {
        &self.0
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
    name = "InsertOutboundShipmentUnallocatedLineResponseWithId",
    params(outbound_shipment::unallocated_line::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateOutboundShipmentUnallocatedLineResponseWithId",
    params(outbound_shipment::unallocated_line::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteOutboundShipmentUnallocatedLineResponseWithId",
    params(outbound_shipment::unallocated_line::DeleteResponse)
))]
pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}
