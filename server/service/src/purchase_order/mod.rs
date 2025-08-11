use self::query::{get_purchase_order, get_purchase_orders};
use crate::{
    purchase_order::{
        insert::{insert_purchase_order, InsertPurchaseOrderError, InsertPurchaseOrderInput},
        update::{update_purchase_order, UpdatePurchaseOrderError, UpdatePurchaseOrderInput},
    },
    service_provider::ServiceContext,
    ListError, ListResult,
};

use repository::{
    PaginationOption, PurchaseOrder, PurchaseOrderFilter, PurchaseOrderLine, PurchaseOrderRow,
    PurchaseOrderSort, RepositoryError,
};

pub mod add_to_purchase_order_from_master_list;
pub mod common;
pub mod generate;
pub mod insert;
pub mod query;
pub mod update;
pub mod validate;

pub trait PurchaseOrderServiceTrait: Sync + Send {
    fn get_purchase_order(
        &self,
        ctx: &ServiceContext,
        store_id: Option<&str>,
        id: &str,
    ) -> Result<Option<PurchaseOrder>, RepositoryError> {
        get_purchase_order(ctx, store_id, id)
    }

    fn get_purchase_orders(
        &self,
        ctx: &ServiceContext,
        store_id: Option<&str>,
        pagination: Option<PaginationOption>,
        filter: Option<PurchaseOrderFilter>,
        sort: Option<PurchaseOrderSort>,
    ) -> Result<ListResult<PurchaseOrder>, ListError> {
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

    fn update_purchase_order(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpdatePurchaseOrderInput,
    ) -> Result<PurchaseOrderRow, UpdatePurchaseOrderError> {
        update_purchase_order(ctx, store_id, input)
    }

    fn add_to_purchase_order_from_master_list(
        &self,
        ctx: &ServiceContext,
        input: add_to_purchase_order_from_master_list::AddToPurchaseOrderFromMasterListInput,
    ) -> Result<
        Vec<PurchaseOrderLine>,
        add_to_purchase_order_from_master_list::AddToPurchaseOrderFromMasterListError,
    > {
        add_to_purchase_order_from_master_list::add_from_master_list(ctx, input)
    }
}

pub struct PurchaseOrderService;
impl PurchaseOrderServiceTrait for PurchaseOrderService {}
