use self::query::{get_purchase_order_line, get_purchase_order_lines};
pub mod query;
use crate::service_provider::ServiceContext;
use crate::ListError;
use crate::ListResult;
use repository::{
    PaginationOption, PurchaseOrderLine, PurchaseOrderLineFilter, PurchaseOrderLineSort,
    RepositoryError,
};

pub trait PurchaseOrderLineServiceTrait: Sync + Send {
    fn get_purchase_order_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        id: &str,
    ) -> Result<Option<PurchaseOrderLine>, RepositoryError> {
        get_purchase_order_line(ctx, store_id, id)
    }

    fn get_purchase_order_lines(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        pagination: Option<PaginationOption>,
        filter: Option<PurchaseOrderLineFilter>,
        sort: Option<PurchaseOrderLineSort>,
    ) -> Result<ListResult<PurchaseOrderLine>, ListError> {
        get_purchase_order_lines(ctx, store_id, pagination, filter, sort)
    }
}

pub struct PurchaseOrderLineService;
impl PurchaseOrderLineServiceTrait for PurchaseOrderLineService {}
