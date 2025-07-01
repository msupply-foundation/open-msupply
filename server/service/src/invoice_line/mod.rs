pub mod validate;

use repository::Invoice;
use repository::InvoiceLine;
use repository::InvoiceLineFilter;
use repository::InvoiceLineSort;
use repository::PaginationOption;
use repository::RepositoryError;

use crate::service_provider::ServiceContext;
use crate::ListError;
use crate::ListResult;

pub mod query;
use self::query::*;

pub mod inbound_shipment_service_line;
use self::inbound_shipment_service_line::*;

pub mod outbound_shipment_service_line;
use self::outbound_shipment_service_line::*;

pub mod get_draft_outbound_lines;
use self::get_draft_outbound_lines::*;

pub mod outbound_shipment_unallocated_line;
use self::outbound_shipment_unallocated_line::*;

pub mod stock_out_line;
use self::stock_out_line::*;

pub mod stock_in_line;
use self::stock_in_line::*;

pub mod update_return_reason_id;
use self::update_return_reason_id::*;

pub mod inbound_shipment_from_internal_order_lines;
use self::inbound_shipment_from_internal_order_lines::*;

pub mod save_stock_out_item_lines;
use self::save_stock_out_item_lines::*;

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
        store_id: &str,
        pagination: Option<PaginationOption>,
        filter: Option<InvoiceLineFilter>,
        sort: Option<InvoiceLineSort>,
    ) -> Result<ListResult<InvoiceLine>, GetInvoiceLinesError> {
        get_invoice_lines(ctx, store_id, pagination, filter, sort)
    }

    fn get_draft_stock_out_lines(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        item_id: &str,
        invoice_id: &str,
    ) -> Result<(Vec<DraftStockOutLine>, DraftStockOutItemData), ListError> {
        get_draft_stock_out_lines(ctx, store_id, item_id, invoice_id)
    }

    // Stock out: Outbound Shipment/Supplier Return/Prescription
    fn insert_stock_out_line(
        &self,
        ctx: &ServiceContext,
        input: InsertStockOutLine,
    ) -> Result<InvoiceLine, InsertStockOutLineError> {
        insert_stock_out_line(ctx, input)
    }

    fn update_stock_out_line(
        &self,
        ctx: &ServiceContext,
        input: UpdateStockOutLine,
    ) -> Result<InvoiceLine, UpdateStockOutLineError> {
        update_stock_out_line(ctx, input)
    }

    fn delete_stock_out_line(
        &self,
        ctx: &ServiceContext,
        input: DeleteStockOutLine,
    ) -> Result<String, DeleteStockOutLineError> {
        delete_stock_out_line(ctx, input)
    }

    // Stock in: Inbound Shipment/Customer Return
    fn insert_stock_in_line(
        &self,
        ctx: &ServiceContext,
        input: InsertStockInLine,
    ) -> Result<InvoiceLine, InsertStockInLineError> {
        insert_stock_in_line(ctx, input)
    }

    fn update_stock_in_line(
        &self,
        ctx: &ServiceContext,
        input: UpdateStockInLine,
    ) -> Result<InvoiceLine, UpdateStockInLineError> {
        update_stock_in_line(ctx, input)
    }

    fn delete_stock_in_line(
        &self,
        ctx: &ServiceContext,
        input: DeleteStockInLine,
    ) -> Result<String, DeleteStockInLineError> {
        delete_stock_in_line(ctx, input)
    }

    // Inbound
    fn insert_inbound_shipment_service_line(
        &self,
        ctx: &ServiceContext,
        input: InsertInboundShipmentServiceLine,
    ) -> Result<InvoiceLine, InsertInboundShipmentServiceLineError> {
        insert_inbound_shipment_service_line(ctx, input)
    }

    fn insert_from_internal_order_line(
        &self,
        ctx: &ServiceContext,
        input: InsertFromInternalOrderLine,
    ) -> Result<InvoiceLine, InsertFromInternalOrderLineError> {
        insert_from_internal_order_line(ctx, input)
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
        input: DeleteStockInLine,
    ) -> Result<String, DeleteInboundShipmentServiceLineError> {
        delete_inbound_shipment_service_line(ctx, input)
    }

    // Outbound
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
        input: DeleteStockOutLine,
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

    fn save_stock_out_item_lines(
        &self,
        ctx: &ServiceContext,
        input: SaveStockOutItemLines,
    ) -> Result<Invoice, SaveStockOutItemLinesError> {
        save_stock_out_item_lines(ctx, input)
    }

    fn update_return_reason_id(
        &self,
        ctx: &ServiceContext,
        input: UpdateLineReturnReason,
    ) -> Result<InvoiceLine, UpdateLineReturnReasonError> {
        update_return_reason_id(ctx, input)
    }

    fn set_prescribed_quantity(
        &self,
        ctx: &ServiceContext,
        input: SetPrescribedQuantity,
    ) -> Result<InvoiceLine, SetPrescribedQuantityError> {
        set_prescribed_quantity(ctx, input)
    }
}

pub struct InvoiceLineService {}
impl InvoiceLineServiceTrait for InvoiceLineService {}
#[derive(Clone, Debug, PartialEq)]
pub struct ShipmentTaxUpdate {
    /// Set or unset the tax value
    pub percentage: Option<f64>,
}
