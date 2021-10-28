mod error;
pub mod inbound_shipment;
pub mod outbound_shipment;

use super::types::{get_invoice_response, Connector, InvoiceLineNode, InvoiceResponse};
use crate::{
    database::repository::StorageConnectionManager,
    server::service::graphql::{schema::types::get_invoice_line_response, ContextExt},
    service::{
        invoice::{
            delete_inbound_shipment, delete_outbound_shipment, insert_inbound_shipment,
            insert_outbound_shipment, update_inbound_shipment, update_outbound_shipment,
        },
        invoice_line::{
            delete_inbound_shipment_line, delete_outbound_shipment_line,
            insert_inbound_shipment_line, insert_outbound_shipment_line,
            update_inbound_shipment_line, update_outbound_shipment_line,
        },
    },
};
use async_graphql::*;
use inbound_shipment::*;
use outbound_shipment::*;

pub struct Mutations;

#[Object]
impl Mutations {
    async fn insert_outbound_shipment(
        &self,
        ctx: &Context<'_>,
        input: InsertOutboundShipmentInput,
    ) -> InsertOutboundShipmentResponse {
        use InsertOutboundShipmentResponse::*;
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        match insert_outbound_shipment(connection_manager, input.into()) {
            Ok(id) => Response(get_invoice_response(connection_manager, id)),
            Err(error) => error.into(),
        }
    }

    async fn update_outbound_shipment(
        &self,
        ctx: &Context<'_>,
        input: UpdateOutboundShipmentInput,
    ) -> UpdateOutboundShipmentResponse {
        use UpdateOutboundShipmentResponse::*;
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        match update_outbound_shipment(connection_manager, input.into()) {
            Ok(id) => Response(get_invoice_response(connection_manager, id)),
            Err(error) => error.into(),
        }
    }

    async fn delete_outbound_shipment(
        &self,
        ctx: &Context<'_>,
        id: String,
    ) -> DeleteOutboundShipmentResponse {
        use DeleteOutboundShipmentResponse::*;
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        match delete_outbound_shipment(connection_manager, id) {
            Ok(id) => Response(DeleteResponse(id)),
            Err(error) => error.into(),
        }
    }

    async fn insert_outbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        input: InsertOutboundShipmentLineInput,
    ) -> InsertOutboundShipmentLineResponse {
        use InsertOutboundShipmentLineResponse::*;
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        match insert_outbound_shipment_line(connection_manager, input.into()) {
            Ok(id) => Response(get_invoice_line_response(connection_manager, id)),
            Err(error) => error.into(),
        }
    }

    async fn update_outbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        input: UpdateOutboundShipmentLineInput,
    ) -> UpdateOutboundShipmentLineResponse {
        use UpdateOutboundShipmentLineResponse::*;
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        match update_outbound_shipment_line(connection_manager, input.into()) {
            Ok(id) => Response(get_invoice_line_response(connection_manager, id)),
            Err(error) => error.into(),
        }
    }

    async fn delete_outbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        input: DeleteOutboundShipmentLineInput,
    ) -> DeleteOutboundShipmentLineResponse {
        use DeleteOutboundShipmentLineResponse::*;
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        match delete_outbound_shipment_line(connection_manager, input.into()) {
            Ok(id) => Response(DeleteResponse(id)),
            Err(error) => error.into(),
        }
    }

    async fn insert_inbound_shipment(
        &self,
        ctx: &Context<'_>,
        input: InsertInboundShipmentInput,
    ) -> InsertInboundShipmentResponse {
        use InsertInboundShipmentResponse::*;
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        match insert_inbound_shipment(connection_manager, input.into()) {
            Ok(id) => Response(get_invoice_response(connection_manager, id)),
            Err(error) => error.into(),
        }
    }

    async fn update_inbound_shipment(
        &self,
        ctx: &Context<'_>,
        input: UpdateInboundShipmentInput,
    ) -> UpdateInboundShipmentResponse {
        use UpdateInboundShipmentResponse::*;
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        match update_inbound_shipment(connection_manager, input.into()) {
            Ok(id) => Response(get_invoice_response(connection_manager, id)),
            Err(error) => error.into(),
        }
    }

    async fn delete_inbound_shipment(
        &self,
        ctx: &Context<'_>,
        input: DeleteInboundShipmentInput,
    ) -> DeleteInboundShipmentResponse {
        use DeleteInboundShipmentResponse::*;
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        match delete_inbound_shipment(connection_manager, input.into()) {
            Ok(id) => Response(DeleteResponse(id)),
            Err(error) => error.into(),
        }
    }

    async fn insert_inbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        input: InsertInboundShipmentLineInput,
    ) -> InsertInboundShipmentLineResponse {
        use InsertInboundShipmentLineResponse::*;
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        match insert_inbound_shipment_line(connection_manager, input.into()) {
            Ok(id) => Response(get_invoice_line_response(connection_manager, id)),
            Err(error) => error.into(),
        }
    }

    async fn update_inbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        input: UpdateInboundShipmentLineInput,
    ) -> UpdateInboundShipmentLineResponse {
        use UpdateInboundShipmentLineResponse::*;
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        match update_inbound_shipment_line(connection_manager, input.into()) {
            Ok(id) => Response(get_invoice_line_response(connection_manager, id)),
            Err(error) => error.into(),
        }
    }

    async fn delete_inbound_shipment_line(
        &self,
        ctx: &Context<'_>,
        input: DeleteInboundShipmentLineInput,
    ) -> DeleteInboundShipmentLineResponse {
        use DeleteInboundShipmentLineResponse::*;
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        match delete_inbound_shipment_line(connection_manager, input.into()) {
            Ok(id) => Response(DeleteResponse(id)),
            Err(error) => error.into(),
        }
    }
}

// Common Mutation Errors
#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum ForeignKey {
    OtherPartyId,
    ItemId,
    InvoiceId,
    StockLineId,
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

pub struct CannotEditFinalisedInvoice;
#[Object]
impl CannotEditFinalisedInvoice {
    pub async fn description(&self) -> &'static str {
        "Cannot edit finalised invoice"
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

pub struct CannotChangeInvoiceBackToDraft;
#[Object]
impl CannotChangeInvoiceBackToDraft {
    pub async fn description(&self) -> &'static str {
        "Cannot change invoice back to draft"
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
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        get_invoice_response(connection_manager, self.0.clone())
    }
}
