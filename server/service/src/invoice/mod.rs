use repository::Invoice;
use repository::InvoiceFilter;
use repository::InvoiceLine;
use repository::InvoiceSort;
use repository::InvoiceType;
use repository::PaginationOption;
use repository::RepositoryError;
use repository::StockLine;

use crate::service_provider::ServiceContext;
use crate::ListError;
use crate::ListResult;
pub mod query;
use self::customer_return::insert::insert_customer_return;
use self::customer_return::insert::InsertCustomerReturn;
use self::customer_return::insert::InsertCustomerReturnError;
use self::inventory_adjustment::add_new_stock_line::{
    add_new_stock_line, AddNewStockLine, AddNewStockLineError,
};
use self::inventory_adjustment::insert_inventory_adjustment;
use self::inventory_adjustment::InsertInventoryAdjustment;
use self::inventory_adjustment::InsertInventoryAdjustmentError;
use self::outbound_shipment::batch_outbound_shipment;
use self::outbound_shipment::BatchOutboundShipment;
use self::outbound_shipment::BatchOutboundShipmentResult;
use self::outbound_shipment::UpdateOutboundShipmentName;
use self::outbound_shipment::UpdateOutboundShipmentNameError;
use self::query::*;
use self::supplier_return::delete::*;
use self::supplier_return::generate_supplier_return_lines::*;
use self::supplier_return::insert::*;
use self::supplier_return::update::*;
use self::supplier_return::update_lines::*;
use supplier_return::update_name::*;

pub mod supplier_return;

pub mod customer_return;
use self::customer_return::*;

pub mod outbound_shipment;
use self::outbound_shipment::{delete::*, insert::*, update::*, update_outbound_shipment_name};
pub mod inbound_shipment;
use self::inbound_shipment::*;

pub mod inventory_adjustment;

pub mod validate;
pub use self::validate::*;

pub mod prescription;
pub use self::prescription::*;

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
        r#type: InvoiceType,
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

        input: InsertInboundShipment,
    ) -> Result<Invoice, InsertInboundShipmentError> {
        insert_inbound_shipment(ctx, input)
    }

    fn update_inbound_shipment(
        &self,
        ctx: &ServiceContext,
        input: UpdateInboundShipment,
    ) -> Result<Invoice, UpdateInboundShipmentError> {
        update_inbound_shipment(ctx, input)
    }

    fn delete_inbound_shipment(
        &self,
        ctx: &ServiceContext,

        input: DeleteInboundShipment,
    ) -> Result<String, DeleteInboundShipmentError> {
        delete_inbound_shipment(ctx, input)
    }

    fn insert_outbound_shipment(
        &self,
        ctx: &ServiceContext,
        input: InsertOutboundShipment,
    ) -> Result<Invoice, InsertOutboundShipmentError> {
        insert_outbound_shipment(ctx, input)
    }

    fn update_outbound_shipment(
        &self,
        ctx: &ServiceContext,
        input: UpdateOutboundShipment,
    ) -> Result<Invoice, UpdateOutboundShipmentError> {
        update_outbound_shipment(ctx, input)
    }

    fn update_outbound_shipment_name(
        &self,
        ctx: &ServiceContext,
        input: UpdateOutboundShipmentName,
    ) -> Result<Invoice, UpdateOutboundShipmentNameError> {
        update_outbound_shipment_name(ctx, input)
    }

    fn delete_outbound_shipment(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<String, DeleteOutboundShipmentError> {
        delete_outbound_shipment(ctx, id)
    }

    fn batch_inbound_shipment(
        &self,
        ctx: &ServiceContext,
        input: BatchInboundShipment,
    ) -> Result<BatchInboundShipmentResult, RepositoryError> {
        batch_inbound_shipment(ctx, input)
    }

    fn batch_outbound_shipment(
        &self,
        ctx: &ServiceContext,
        input: BatchOutboundShipment,
    ) -> Result<BatchOutboundShipmentResult, RepositoryError> {
        batch_outbound_shipment(ctx, input)
    }

    fn add_to_outbound_shipment_from_master_list(
        &self,
        ctx: &ServiceContext,
        input: common::AddToShipmentFromMasterListInput,
    ) -> Result<Vec<InvoiceLine>, outbound_shipment::AddToOutboundShipmentFromMasterListError> {
        outbound_shipment::add_from_master_list(ctx, input)
    }

    fn add_to_inbound_shipment_from_master_list(
        &self,
        ctx: &ServiceContext,
        input: common::AddToShipmentFromMasterListInput,
    ) -> Result<Vec<InvoiceLine>, inbound_shipment::AddToInboundShipmentFromMasterListError> {
        inbound_shipment::add_from_master_list(ctx, input)
    }

    fn insert_prescription(
        &self,
        ctx: &ServiceContext,
        input: InsertPrescription,
    ) -> Result<Invoice, InsertPrescriptionError> {
        insert_prescription(ctx, input)
    }

    fn update_prescription(
        &self,
        ctx: &ServiceContext,
        input: UpdatePrescription,
    ) -> Result<Invoice, UpdatePrescriptionError> {
        update_prescription(ctx, input)
    }

    fn delete_prescription(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<String, DeletePrescriptionError> {
        delete_prescription(ctx, id)
    }

    fn batch_prescription(
        &self,
        ctx: &ServiceContext,
        input: BatchPrescription,
    ) -> Result<BatchPrescriptionResult, RepositoryError> {
        batch_prescription(ctx, input)
    }

    fn generate_supplier_return_lines(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: GenerateSupplierReturnLinesInput,
    ) -> Result<ListResult<SupplierReturnLine>, ListError> {
        generate_supplier_return_lines(ctx, store_id, input)
    }

    fn insert_supplier_return(
        &self,
        ctx: &ServiceContext,
        input: InsertSupplierReturn,
    ) -> Result<Invoice, InsertSupplierReturnError> {
        insert_supplier_return(ctx, input)
    }

    fn update_supplier_return(
        &self,
        ctx: &ServiceContext,
        input: UpdateSupplierReturn,
    ) -> Result<Invoice, UpdateSupplierReturnError> {
        update_supplier_return(ctx, input)
    }

    fn update_supplier_return_name(
        &self,
        ctx: &ServiceContext,
        input: UpdateSupplierReturnName,
    ) -> Result<Invoice, UpdateSupplierReturnNameError> {
        update_supplier_return_name(ctx, input)
    }

    fn update_supplier_return_lines(
        &self,
        ctx: &ServiceContext,
        input: UpdateSupplierReturnLines,
    ) -> Result<Invoice, UpdateSupplierReturnLinesError> {
        update_supplier_return_lines(ctx, input)
    }

    fn delete_supplier_return(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<String, DeleteSupplierReturnError> {
        delete_supplier_return(ctx, id)
    }

    fn generate_customer_return_lines(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: GenerateCustomerReturnLinesInput,
    ) -> Result<ListResult<CustomerReturnLine>, ListError> {
        generate_customer_return_lines(ctx, store_id, input)
    }

    fn insert_customer_return(
        &self,
        ctx: &ServiceContext,
        input: InsertCustomerReturn,
    ) -> Result<Invoice, InsertCustomerReturnError> {
        insert_customer_return(ctx, input)
    }

    fn update_customer_return(
        &self,
        ctx: &ServiceContext,
        input: UpdateCustomerReturn,
    ) -> Result<Invoice, UpdateCustomerReturnError> {
        update_customer_return(ctx, input)
    }

    fn update_customer_return_lines(
        &self,
        ctx: &ServiceContext,
        input: UpdateCustomerReturnLines,
    ) -> Result<Invoice, UpdateCustomerReturnLinesError> {
        update_customer_return_lines(ctx, input)
    }

    fn delete_customer_return(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<String, DeleteCustomerReturnError> {
        delete_customer_return(ctx, id)
    }

    fn insert_inventory_adjustment(
        &self,
        ctx: &ServiceContext,
        input: InsertInventoryAdjustment,
    ) -> Result<Invoice, InsertInventoryAdjustmentError> {
        insert_inventory_adjustment(ctx, input)
    }

    fn add_new_stock_line(
        &self,
        ctx: &ServiceContext,
        input: AddNewStockLine,
    ) -> Result<StockLine, AddNewStockLineError> {
        add_new_stock_line(ctx, input)
    }
}

pub struct InvoiceService;
impl InvoiceServiceTrait for InvoiceService {}
