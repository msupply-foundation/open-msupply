use self::{
    query::get_requisition_lines,
    request_requisition_line::{
        delete_request_requisition_line, insert_request_requisition_line,
        update_request_requisition_line, DeleteRequestRequisitionLine,
        DeleteRequestRequisitionLineError, InsertRequestRequisitionLine,
        InsertRequestRequisitionLineError, UpdateRequestRequisitionLine,
        UpdateRequestRequisitionLineError,
    }, response_requisition_line::{update_response_requisition_line, UpdateResponseRequisitionLine, UpdateResponseRequisitionLineError},
};

use super::{ListError, ListResult};
use crate::service_provider::ServiceContext;

use domain::PaginationOption;
use repository::{RequisitionLine, RequisitionLineFilter};

pub mod common;
pub mod query;
pub mod request_requisition_line;
pub mod response_requisition_line;

pub trait RequisitionLineServiceTrait: Sync + Send {
    fn get_requisition_lines(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<RequisitionLineFilter>,
    ) -> Result<ListResult<RequisitionLine>, ListError> {
        get_requisition_lines(ctx, pagination, filter)
    }

    fn insert_request_requisition_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: InsertRequestRequisitionLine,
    ) -> Result<RequisitionLine, InsertRequestRequisitionLineError> {
        insert_request_requisition_line(ctx, store_id, input)
    }

    fn update_request_requisition_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpdateRequestRequisitionLine,
    ) -> Result<RequisitionLine, UpdateRequestRequisitionLineError> {
        update_request_requisition_line(ctx, store_id, input)
    }

    fn delete_request_requisition_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: DeleteRequestRequisitionLine,
    ) -> Result<String, DeleteRequestRequisitionLineError> {
        delete_request_requisition_line(ctx, store_id, input)
    }

    fn update_response_requisition_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpdateResponseRequisitionLine,
    ) -> Result<RequisitionLine, UpdateResponseRequisitionLineError> {
        update_response_requisition_line(ctx, store_id, input)
    }
}

pub struct RequisitionLineService {}
impl RequisitionLineServiceTrait for RequisitionLineService {}
