use self::query::{get_purchase_order_line, get_purchase_order_lines};
pub mod query;
use crate::{
    purchase_order_line::{
        delete::{delete_purchase_order_line, DeletePurchaseOrderLineError},
        insert::{
            insert_purchase_order_line, InsertPurchaseOrderLineError, InsertPurchaseOrderLineInput,
        },
        update::{
            update_purchase_order_line, UpdatePurchaseOrderLineInput,
            UpdatePurchaseOrderLineInputError,
        },
    },
    service_provider::ServiceContext,
    ListError, ListResult,
};
use repository::PurchaseOrderLineRow;
use repository::{
    PaginationOption, PurchaseOrderLine, PurchaseOrderLineFilter, PurchaseOrderLineSort,
    RepositoryError,
};

pub mod delete;
pub mod insert;
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
}

pub struct PurchaseOrderLineService;
impl PurchaseOrderLineServiceTrait for PurchaseOrderLineService {}
