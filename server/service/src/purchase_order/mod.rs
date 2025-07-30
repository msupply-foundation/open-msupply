use self::query::{get_purchase_order, get_purchase_orders};
use crate::{service_provider::ServiceContext, ListError, ListResult};

use insert::{insert_purchase_order, InsertPurchaseOrderError, InsertPurchaseOrderInput};
use repository::{
    PaginationOption, PurchaseOrderFilter, PurchaseOrderRow, PurchaseOrderSort, RepositoryError,
};

pub mod insert;
pub mod query;
pub mod validate;

pub trait PurchaseOrderServiceTrait: Sync + Send {
    fn get_purchase_order(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        id: &str,
    ) -> Result<Option<PurchaseOrderRow>, RepositoryError> {
        get_purchase_order(ctx, store_id, id)
    }

    fn get_purchase_orders(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        pagination: Option<PaginationOption>,
        filter: Option<PurchaseOrderFilter>,
        sort: Option<PurchaseOrderSort>,
    ) -> Result<ListResult<PurchaseOrderRow>, ListError> {
        get_purchase_orders(ctx, store_id, pagination, filter, sort)
    }

    fn insert_purchase_order(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: InsertPurchaseOrderInput,
    ) -> Result<PurchaseOrderRow, InsertPurchaseOrderError> {
        insert_purchase_order(ctx, store_id, input)
    }
}

pub struct PurchaseOrderService;
impl PurchaseOrderServiceTrait for PurchaseOrderService {}
