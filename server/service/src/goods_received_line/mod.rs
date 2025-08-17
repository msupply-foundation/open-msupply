pub mod insert;
pub mod query;

use repository::GoodsReceivedLine;
use repository::GoodsReceivedLineFilter;
use repository::GoodsReceivedLineRow;
use repository::GoodsReceivedLineSort;
use repository::{PaginationOption, RepositoryError};

use crate::{
    goods_received_line::insert::{
        insert_goods_received_line, insert_goods_received_lines_from_purchase_order,
        InsertGoodsReceivedLineError, InsertGoodsReceivedLineInput, InsertGoodsReceivedLinesError,
        InsertGoodsReceivedLinesFromPurchaseOrderInput,
    },
    goods_received_line::query::{get_goods_received_line, get_goods_received_lines},
    service_provider::ServiceContext,
    ListError, ListResult,
};

pub trait GoodsReceivedLineServiceTrait: Sync + Send {
    fn get_goods_received_line(
        &self,
        ctx: &ServiceContext,
        store_id_option: Option<&str>,
        id: &str,
    ) -> Result<Option<GoodsReceivedLine>, RepositoryError> {
        get_goods_received_line(ctx, store_id_option, id)
    }

    fn get_goods_received_lines(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<GoodsReceivedLineFilter>,
        sort: Option<GoodsReceivedLineSort>,
    ) -> Result<ListResult<GoodsReceivedLine>, ListError> {
        get_goods_received_lines(ctx, pagination, filter, sort)
    }

    fn insert_goods_received_line(
        &self,
        ctx: &ServiceContext,
        input: InsertGoodsReceivedLineInput,
    ) -> Result<GoodsReceivedLineRow, InsertGoodsReceivedLineError> {
        insert_goods_received_line(ctx, input)
    }

    fn insert_goods_received_lines_from_purchase_order(
        &self,
        ctx: &ServiceContext,
        input: InsertGoodsReceivedLinesFromPurchaseOrderInput,
    ) -> Result<Vec<GoodsReceivedLineRow>, InsertGoodsReceivedLinesError> {
        insert_goods_received_lines_from_purchase_order(ctx, input)
    }
}

pub struct GoodsReceivedLineService;
impl GoodsReceivedLineServiceTrait for GoodsReceivedLineService {}
