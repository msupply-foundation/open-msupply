use self::query::{
    get_purchase_order_line, get_purchase_order_lines, get_units_ordered_in_other_purchase_orders,
};
pub mod query;
use crate::{
    ListError, ListResult,
    purchase_order_line::{
        delete::{
            DeletePurchaseOrderLineError, DeletePurchaseOrderLineOutcome,
            delete_purchase_order_line, delete_purchase_order_lines,
        },
        insert::{
            InsertPurchaseOrderLineError, InsertPurchaseOrderLineInput, insert_purchase_order_line,
        },
        update::{
            UpdatePurchaseOrderLineInput, UpdatePurchaseOrderLineInputError,
            update_purchase_order_line,
        },
    },
    service_provider::ServiceContext,
};
use repository::PurchaseOrderLineRow;
use repository::{
    PaginationOption, PurchaseOrderLine, PurchaseOrderLineFilter, PurchaseOrderLineSort,
    RepositoryError,
};

pub mod delete;
pub mod insert;
pub mod log;
pub mod update;

pub trait PurchaseOrderLineServiceTrait: Sync + Send {
    fn get_purchase_order_line(
        &self,
        ctx: &ServiceContext,
        store_id_option: Option<&str>,
        id: &str,
    ) -> Result<Option<PurchaseOrderLine>, RepositoryError> {
        get_purchase_order_line(ctx, store_id_option, id)
    }

    fn get_purchase_order_lines(
        &self,
        ctx: &ServiceContext,
        store_id_option: Option<&str>,
        pagination: Option<PaginationOption>,
        filter: Option<PurchaseOrderLineFilter>,
        sort: Option<PurchaseOrderLineSort>,
    ) -> Result<ListResult<PurchaseOrderLine>, ListError> {
        get_purchase_order_lines(ctx, store_id_option, pagination, filter, sort)
    }

    fn insert_purchase_order_line(
        &self,
        ctx: &ServiceContext,
        input: InsertPurchaseOrderLineInput,
    ) -> Result<PurchaseOrderLineRow, InsertPurchaseOrderLineError> {
        insert_purchase_order_line(ctx, input)
    }

    fn update_purchase_order_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpdatePurchaseOrderLineInput,
    ) -> Result<PurchaseOrderLine, UpdatePurchaseOrderLineInputError> {
        update_purchase_order_line(ctx, store_id, input)
    }

    fn delete_purchase_order_line(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<String, DeletePurchaseOrderLineError> {
        delete_purchase_order_line(ctx, id)
    }

    fn delete_purchase_order_lines(
        &self,
        ctx: &ServiceContext,
        ids: Vec<String>,
    ) -> Result<Vec<DeletePurchaseOrderLineOutcome>, RepositoryError> {
        delete_purchase_order_lines(ctx, ids)
    }

    fn get_units_ordered_in_other_purchase_orders(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        item_id: &str,
        exclude_purchase_order_id: &str,
    ) -> Result<f64, RepositoryError> {
        get_units_ordered_in_other_purchase_orders(
            ctx,
            store_id,
            item_id,
            exclude_purchase_order_id,
        )
    }
}

pub struct PurchaseOrderLineService;
impl PurchaseOrderLineServiceTrait for PurchaseOrderLineService {}
