use repository::Invoice;
use repository::InvoiceFilter;
use repository::InvoiceRowType;
use repository::InvoiceSort;
use repository::PaginationOption;
use repository::RepositoryError;

use crate::service_provider::ServiceContext;
use crate::ListError;
use crate::ListResult;

pub mod query;
use self::query::*;

pub mod outbound_shipment;
use self::outbound_shipment::*;

pub mod inbound_shipment;
use self::inbound_shipment::*;

pub mod validate;
pub use self::validate::*;

pub mod common;

pub trait InvoiceServiceTrait: Sync + Send {
    fn get_invoices(
        &self,
        ctx: &ServiceContext,
        store_id_option: Option<&str>,
        pagination: Option<PaginationOption>,
        filter: Option<InvoiceFilter>,
        sort: Option<InvoiceSort>,
    ) -> Result<ListResult<Invoice>, ListError> {
        get_invoices(ctx, store_id_option, pagination, filter, sort)
    }

    fn get_invoice_by_number(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        invoice_number: u32,
        r#type: InvoiceRowType,
    ) -> Result<Option<Invoice>, RepositoryError> {
        get_invoice_by_number(ctx, store_id, invoice_number, r#type)
    }

    fn get_invoice(
        &self,
        ctx: &ServiceContext,
        store_id_option: Option<&str>,
        id: &str,
    ) -> Result<Option<Invoice>, RepositoryError> {
        get_invoice(ctx, store_id_option, id)
    }

    fn insert_inbound_shipment(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        user_id: &str,
        input: InsertInboundShipment,
    ) -> Result<Invoice, InsertInboundShipmentError> {
        insert_inbound_shipment(ctx, store_id, user_id, input)
    }

    fn update_inbound_shipment(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        user_id: &str,
        input: UpdateInboundShipment,
    ) -> Result<Invoice, UpdateInboundShipmentError> {
        update_inbound_shipment(ctx, store_id, user_id, input)
    }

    fn delete_inbound_shipment(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        user_id: &str,
        input: DeleteInboundShipment,
    ) -> Result<String, DeleteInboundShipmentError> {
        delete_inbound_shipment(ctx, user_id, store_id, input)
    }

    fn insert_outbound_shipment(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        user_id: &str,
        input: InsertOutboundShipment,
    ) -> Result<Invoice, InsertOutboundShipmentError> {
        insert_outbound_shipment(ctx, store_id, user_id, input)
    }

    fn update_outbound_shipment(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpdateOutboundShipment,
    ) -> Result<Invoice, UpdateOutboundShipmentError> {
        update_outbound_shipment(ctx, store_id, input)
    }

    fn delete_outbound_shipment(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        id: String,
    ) -> Result<String, DeleteOutboundShipmentError> {
        delete_outbound_shipment(ctx, store_id, id)
    }

    fn batch_inbound_shipment(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        user_id: &str,
        input: BatchInboundShipment,
    ) -> Result<BatchInboundShipmentResult, RepositoryError> {
        batch_inbound_shipment(ctx, store_id, user_id, input)
    }

    fn batch_outbound_shipment(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        user_id: &str,
        input: BatchOutboundShipment,
    ) -> Result<BatchOutboundShipmentResult, RepositoryError> {
        batch_outbound_shipment(ctx, store_id, user_id, input)
    }
}

pub struct InvoiceService;
impl InvoiceServiceTrait for InvoiceService {}
