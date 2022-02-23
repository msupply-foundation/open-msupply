use self::{
    query::{get_requisition, get_requisition_by_number, get_requisitions},
    request_requisition::{
        add_from_master_list, delete_request_requisition, insert_request_requisition,
        update_request_requisition, use_suggested_quantity, AddFromMasterList,
        AddFromMasterListError, DeleteRequestRequisition, DeleteRequestRequisitionError,
        InsertRequestRequisition, InsertRequestRequisitionError, UpdateRequestRequisition,
        UpdateRequestRequisitionError, UseSuggestedQuantity, UseSuggestedQuantityError,
    },
    response_requisition::{
        create_requisition_shipment, supply_requested_quantity, update_response_requisition,
        CreateRequisitionShipment, CreateRequisitionShipmentError, SupplyRequestedQuantity,
        SupplyRequestedQuantityError, UpdateResponseRequisition, UpdateResponseRequisitionError,
    },
};

use super::{ListError, ListResult};
use crate::service_provider::ServiceContext;
use domain::{invoice::Invoice, PaginationOption};
use repository::{
    schema::RequisitionRowType, RepositoryError, Requisition, RequisitionFilter, RequisitionLine,
    RequisitionSort,
};

pub mod common;
pub mod query;
pub mod request_requisition;
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
        r#type: RequisitionRowType,
    ) -> Result<Option<Requisition>, RepositoryError> {
        get_requisition_by_number(ctx, store_id, requisition_number, r#type)
    }

    fn insert_request_requisition(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: InsertRequestRequisition,
    ) -> Result<Requisition, InsertRequestRequisitionError> {
        insert_request_requisition(ctx, store_id, input)
    }

    fn update_request_requisition(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpdateRequestRequisition,
    ) -> Result<Requisition, UpdateRequestRequisitionError> {
        update_request_requisition(ctx, store_id, input)
    }

    fn delete_request_requisition(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: DeleteRequestRequisition,
    ) -> Result<String, DeleteRequestRequisitionError> {
        delete_request_requisition(ctx, store_id, input)
    }

    fn use_suggested_quantity(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UseSuggestedQuantity,
    ) -> Result<Vec<RequisitionLine>, UseSuggestedQuantityError> {
        use_suggested_quantity(ctx, store_id, input)
    }

    fn add_from_master_list(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: AddFromMasterList,
    ) -> Result<Vec<RequisitionLine>, AddFromMasterListError> {
        add_from_master_list(ctx, store_id, input)
    }

    fn update_response_requisition(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpdateResponseRequisition,
    ) -> Result<Requisition, UpdateResponseRequisitionError> {
        update_response_requisition(ctx, store_id, input)
    }

    fn supply_requested_quantity(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: SupplyRequestedQuantity,
    ) -> Result<Vec<RequisitionLine>, SupplyRequestedQuantityError> {
        supply_requested_quantity(ctx, store_id, input)
    }

    fn create_requisition_shipment(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: CreateRequisitionShipment,
    ) -> Result<Invoice, CreateRequisitionShipmentError> {
        create_requisition_shipment(ctx, store_id, input)
    }
}

pub struct RequisitionService {}
impl RequisitionServiceTrait for RequisitionService {}
