use self::{
    query::{get_requisition, get_requisition_by_number, get_requisitions},
    request_requisition::{
        add_from_master_list, batch_request_requisition, delete_request_requisition,
        insert_program_request_requisition, insert_request_requisition, update_request_requisition,
        use_suggested_quantity, AddFromMasterList, AddFromMasterListError, BatchRequestRequisition,
        BatchRequestRequisitionResult, DeleteRequestRequisition, DeleteRequestRequisitionError,
        InsertProgramRequestRequisition, InsertProgramRequestRequisitionError,
        InsertRequestRequisition, InsertRequestRequisitionError, UpdateRequestRequisition,
        UpdateRequestRequisitionError, UseSuggestedQuantity, UseSuggestedQuantityError,
    },
    requisition_supply_status::{get_requisitions_supply_statuses, RequisitionLineSupplyStatus},
    response_requisition::{
        create_requisition_shipment, insert_program_response_requisition,
        insert_response_requisition, supply_requested_quantity, update_response_requisition,
        CreateRequisitionShipment, CreateRequisitionShipmentError,
        InsertProgramResponseRequisition, InsertProgramResponseRequisitionError,
        InsertResponseRequisition, InsertResponseRequisitionError, SupplyRequestedQuantity,
        SupplyRequestedQuantityError, UpdateResponseRequisition, UpdateResponseRequisitionError,
    },
};

use super::{ListError, ListResult};
use crate::service_provider::ServiceContext;
use program_settings::{
    customer_program_settings::CustomerProgramSettings, get_customer_program_requisition_settings,
    get_supplier_program_requisition_settings, supplier_program_settings::SupplierProgramSettings,
};
use repository::{
    requisition_row::RequisitionType, Invoice, PaginationOption, RepositoryError, Requisition,
    RequisitionFilter, RequisitionLine, RequisitionSort,
};
use request_requisition::{get_indicator_information, CustomerIndicatorInformation};
use response_requisition::{
    batch_response_requisition, delete_response_requisition, BatchResponseRequisition,
    BatchResponseRequisitionResult, DeleteResponseRequisition, DeleteResponseRequisitionError,
};

pub mod common;
pub mod indicator_value;
pub mod program_indicator;
pub mod program_settings;
pub mod query;
pub mod request_requisition;
pub mod requisition_supply_status;
pub mod response_requisition;

pub trait RequisitionServiceTrait: Sync + Send {
    fn get_requisitions(
        &self,
        ctx: &ServiceContext,
        store_id_option: Option<&str>,
        pagination: Option<PaginationOption>,
        filter: Option<RequisitionFilter>,
        sort: Option<RequisitionSort>,
    ) -> Result<ListResult<Requisition>, ListError> {
        get_requisitions(ctx, store_id_option, pagination, filter, sort)
    }

    fn get_requisition(
        &self,
        ctx: &ServiceContext,
        store_id_option: Option<&str>,
        id: &str,
    ) -> Result<Option<Requisition>, RepositoryError> {
        get_requisition(ctx, store_id_option, id)
    }

    fn get_requisition_by_number(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        requisition_number: u32,
        r#type: RequisitionType,
    ) -> Result<Option<Requisition>, RepositoryError> {
        get_requisition_by_number(ctx, store_id, requisition_number, r#type)
    }

    fn get_requisitions_supply_status(
        &self,
        ctx: &ServiceContext,
        requisition_ids: Vec<String>,
    ) -> Result<Vec<RequisitionLineSupplyStatus>, RepositoryError> {
        get_requisitions_supply_statuses(&ctx.connection, requisition_ids)
    }

    fn insert_request_requisition(
        &self,
        ctx: &ServiceContext,
        input: InsertRequestRequisition,
    ) -> Result<Requisition, InsertRequestRequisitionError> {
        insert_request_requisition(ctx, input)
    }

    fn insert_program_request_requisition(
        &self,
        ctx: &ServiceContext,
        input: InsertProgramRequestRequisition,
    ) -> Result<Requisition, InsertProgramRequestRequisitionError> {
        insert_program_request_requisition(ctx, input)
    }

    fn update_request_requisition(
        &self,
        ctx: &ServiceContext,
        input: UpdateRequestRequisition,
    ) -> Result<Requisition, UpdateRequestRequisitionError> {
        update_request_requisition(ctx, input)
    }

    fn delete_request_requisition(
        &self,
        ctx: &ServiceContext,
        input: DeleteRequestRequisition,
    ) -> Result<String, DeleteRequestRequisitionError> {
        delete_request_requisition(ctx, input)
    }

    fn use_suggested_quantity(
        &self,
        ctx: &ServiceContext,
        input: UseSuggestedQuantity,
    ) -> Result<Vec<RequisitionLine>, UseSuggestedQuantityError> {
        use_suggested_quantity(ctx, input)
    }

    fn add_from_master_list(
        &self,
        ctx: &ServiceContext,
        input: AddFromMasterList,
    ) -> Result<Vec<RequisitionLine>, AddFromMasterListError> {
        add_from_master_list(ctx, input)
    }

    fn insert_response_requisition(
        &self,
        ctx: &ServiceContext,
        input: InsertResponseRequisition,
    ) -> Result<Requisition, InsertResponseRequisitionError> {
        insert_response_requisition(ctx, input)
    }

    fn insert_program_response_requisition(
        &self,
        ctx: &ServiceContext,
        input: InsertProgramResponseRequisition,
    ) -> Result<Requisition, InsertProgramResponseRequisitionError> {
        insert_program_response_requisition(ctx, input)
    }

    fn update_response_requisition(
        &self,
        ctx: &ServiceContext,
        input: UpdateResponseRequisition,
    ) -> Result<Requisition, UpdateResponseRequisitionError> {
        update_response_requisition(ctx, input)
    }

    fn delete_response_requisition(
        &self,
        ctx: &ServiceContext,
        input: DeleteResponseRequisition,
    ) -> Result<String, DeleteResponseRequisitionError> {
        delete_response_requisition(ctx, input)
    }

    fn supply_requested_quantity(
        &self,
        ctx: &ServiceContext,
        input: SupplyRequestedQuantity,
    ) -> Result<Vec<RequisitionLine>, SupplyRequestedQuantityError> {
        supply_requested_quantity(ctx, input)
    }

    fn create_requisition_shipment(
        &self,
        ctx: &ServiceContext,
        input: CreateRequisitionShipment,
    ) -> Result<Invoice, CreateRequisitionShipmentError> {
        create_requisition_shipment(ctx, input)
    }

    fn batch_request_requisition(
        &self,
        ctx: &ServiceContext,
        input: BatchRequestRequisition,
    ) -> Result<BatchRequestRequisitionResult, RepositoryError> {
        batch_request_requisition(ctx, input)
    }

    fn batch_response_requisition(
        &self,
        ctx: &ServiceContext,
        input: BatchResponseRequisition,
    ) -> Result<BatchResponseRequisitionResult, RepositoryError> {
        batch_response_requisition(ctx, input)
    }

    fn get_supplier_program_requisition_settings(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
    ) -> Result<Vec<SupplierProgramSettings>, RepositoryError> {
        get_supplier_program_requisition_settings(ctx, store_id)
    }

    fn get_customer_program_requisition_settings(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
    ) -> Result<Vec<CustomerProgramSettings>, RepositoryError> {
        get_customer_program_requisition_settings(ctx, store_id)
    }

    fn get_indicator_information(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        period_id: &str,
        program_id: &str,
    ) -> Result<Vec<CustomerIndicatorInformation>, RepositoryError> {
        get_indicator_information(ctx, store_id, period_id, program_id)
    }
}

pub struct RequisitionService {}
impl RequisitionServiceTrait for RequisitionService {}
