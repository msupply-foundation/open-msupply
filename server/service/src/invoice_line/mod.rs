pub mod validate;

use repository::InvoiceLine;
use repository::InvoiceLineFilter;
use repository::RepositoryError;

use crate::service_provider::ServiceContext;

pub mod query;
use self::query::*;

pub mod inbound_shipment_line;
use self::inbound_shipment_line::*;

pub mod inbound_shipment_service_line;
use self::inbound_shipment_service_line::*;

pub mod outbound_shipment_line;
use self::outbound_shipment_line::*;

pub mod outbound_shipment_service_line;
use self::outbound_shipment_service_line::*;

pub mod outbound_shipment_unallocated_line;
use self::outbound_shipment_unallocated_line::*;

pub mod prescription_line;
use self::prescription_line::*;

pub mod common_insert_line;
use self::common_insert_line::*;

pub mod common_update_line;
use self::common_update_line::*;

pub trait InvoiceLineServiceTrait: Sync + Send {
    fn get_invoice_line(
        &self,
        ctx: &ServiceContext,
        id: &str,
    ) -> Result<Option<InvoiceLine>, RepositoryError> {
        get_invoice_line(ctx, id)
    }

    fn get_invoice_lines(
        &self,
        ctx: &ServiceContext,
        filter: Option<InvoiceLineFilter>,
    ) -> Result<Vec<InvoiceLine>, RepositoryError> {
        get_invoice_lines(ctx, filter)
    }

    // Outbound
    fn insert_outbound_shipment_line(
        &self,
        ctx: &ServiceContext,
        input: InsertInvoiceLine,
    ) -> Result<InvoiceLine, InsertInvoiceLineError> {
        insert_outbound_shipment_line(ctx, input)
    }

    fn update_outbound_shipment_line(
        &self,
        ctx: &ServiceContext,
        input: UpdateInvoiceLine,
    ) -> Result<InvoiceLine, UpdateInvoiceLineError> {
        update_outbound_shipment_line(ctx, input)
    }

    fn delete_outbound_shipment_line(
        &self,
        ctx: &ServiceContext,
        input: DeleteOutboundShipmentLine,
    ) -> Result<String, DeleteOutboundShipmentLineError> {
        delete_outbound_shipment_line(ctx, input)
    }

    fn insert_inbound_shipment_service_line(
        &self,
        ctx: &ServiceContext,
        input: InsertInboundShipmentServiceLine,
    ) -> Result<InvoiceLine, InsertInboundShipmentServiceLineError> {
        insert_inbound_shipment_service_line(ctx, input)
    }

    fn update_inbound_shipment_service_line(
        &self,
        ctx: &ServiceContext,
        input: UpdateInboundShipmentServiceLine,
    ) -> Result<InvoiceLine, UpdateInboundShipmentServiceLineError> {
        update_inbound_shipment_service_line(ctx, input)
    }

    fn delete_inbound_shipment_service_line(
        &self,
        ctx: &ServiceContext,
        input: DeleteInboundShipmentLine,
    ) -> Result<String, DeleteInboundShipmentServiceLineError> {
        delete_inbound_shipment_service_line(ctx, input)
    }

    // Inbound
    fn insert_inbound_shipment_line(
        &self,
        ctx: &ServiceContext,
        input: InsertInboundShipmentLine,
    ) -> Result<InvoiceLine, InsertInboundShipmentLineError> {
        insert_inbound_shipment_line(ctx, input)
    }

    fn update_inbound_shipment_line(
        &self,
        ctx: &ServiceContext,
        input: UpdateInboundShipmentLine,
    ) -> Result<InvoiceLine, UpdateInboundShipmentLineError> {
        update_inbound_shipment_line(ctx, input)
    }

    fn delete_inbound_shipment_line(
        &self,
        ctx: &ServiceContext,
        input: DeleteInboundShipmentLine,
    ) -> Result<String, DeleteInboundShipmentLineError> {
        delete_inbound_shipment_line(ctx, input)
    }

    fn insert_outbound_shipment_service_line(
        &self,
        ctx: &ServiceContext,
        input: InsertOutboundShipmentServiceLine,
    ) -> Result<InvoiceLine, InsertOutboundShipmentServiceLineError> {
        insert_outbound_shipment_service_line(ctx, input)
    }

    fn update_outbound_shipment_service_line(
        &self,
        ctx: &ServiceContext,
        input: UpdateOutboundShipmentServiceLine,
    ) -> Result<InvoiceLine, UpdateOutboundShipmentServiceLineError> {
        update_outbound_shipment_service_line(ctx, input)
    }

    fn delete_outbound_shipment_service_line(
        &self,
        ctx: &ServiceContext,
        input: DeleteOutboundShipmentLine,
    ) -> Result<String, DeleteOutboundShipmentServiceLineError> {
        delete_outbound_shipment_service_line(ctx, input)
    }

    fn insert_outbound_shipment_unallocated_line(
        &self,
        ctx: &ServiceContext,
        input: InsertOutboundShipmentUnallocatedLine,
    ) -> Result<InvoiceLine, InsertOutboundShipmentUnallocatedLineError> {
        insert_outbound_shipment_unallocated_line(ctx, input)
    }

    fn update_outbound_shipment_unallocated_line(
        &self,
        ctx: &ServiceContext,
        input: UpdateOutboundShipmentUnallocatedLine,
    ) -> Result<InvoiceLine, UpdateOutboundShipmentUnallocatedLineError> {
        update_outbound_shipment_unallocated_line(ctx, input)
    }

    fn delete_outbound_shipment_unallocated_line(
        &self,
        ctx: &ServiceContext,
        input: DeleteOutboundShipmentUnallocatedLine,
    ) -> Result<String, DeleteOutboundShipmentUnallocatedLineError> {
        delete_outbound_shipment_unallocated_line(ctx, input)
    }

    fn allocate_outbound_shipment_unallocated_line(
        &self,
        ctx: &ServiceContext,
        line_id: String,
    ) -> Result<AllocateLineResult, AllocateOutboundShipmentUnallocatedLineError> {
        allocate_outbound_shipment_unallocated_line(ctx, line_id)
    }

    // Prescription
    fn insert_prescription_line(
        &self,
        ctx: &ServiceContext,
        input: InsertInvoiceLine,
    ) -> Result<InvoiceLine, InsertInvoiceLineError> {
        insert_prescription_line(ctx, input)
    }

    fn update_prescription_line(
        &self,
        ctx: &ServiceContext,
        input: UpdateInvoiceLine,
    ) -> Result<InvoiceLine, UpdateInvoiceLineError> {
        update_prescription_line(ctx, input)
    }
}

pub struct InvoiceLineService {}
impl InvoiceLineServiceTrait for InvoiceLineService {}
#[derive(Clone, Debug, PartialEq)]
pub struct ShipmentTaxUpdate {
    /// Set or unset the tax value
    pub percentage: Option<f64>,
}
