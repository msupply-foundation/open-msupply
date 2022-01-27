use self::query::get_requisition_lines;

use super::{ListError, ListResult};
use crate::service_provider::ServiceContext;

use domain::PaginationOption;
use repository::{RequisitionLine, RequisitionLineFilter};

pub mod query;

pub trait RequisitionLineServiceTrait: Sync + Send {
    fn get_requisition_lines(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<RequisitionLineFilter>,
    ) -> Result<ListResult<RequisitionLine>, ListError> {
        get_requisition_lines(ctx, pagination, filter)
    }
}

pub struct RequisitionLineService {}
impl RequisitionLineServiceTrait for RequisitionLineService {}
