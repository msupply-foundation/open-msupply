use self::query::{get_requisition, get_requisition_by_number, get_requisitions};

use super::{ListError, ListResult};
use crate::service_provider::ServiceContext;
use domain::PaginationOption;
use repository::{schema::RequisitionRowType, Requisition, RequisitionFilter, RequisitionSort};

pub mod query;

pub trait RequisitionServiceTrait: Sync + Send {
    fn get_requisitions(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        pagination: Option<PaginationOption>,
        filter: Option<RequisitionFilter>,
        sort: Option<RequisitionSort>,
    ) -> Result<ListResult<Requisition>, ListError> {
        get_requisitions(ctx, store_id, pagination, filter, sort)
    }

    fn get_requisition(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        id: &str,
    ) -> Result<Option<Requisition>, ListError> {
        get_requisition(ctx, store_id, id)
    }

    fn get_requisition_by_number(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        requisition_number: u32,
        r#type: RequisitionRowType,
    ) -> Result<Option<Requisition>, ListError> {
        get_requisition_by_number(ctx, store_id, requisition_number, r#type)
    }
}

pub struct RequisitionService {}
impl RequisitionServiceTrait for RequisitionService {}
