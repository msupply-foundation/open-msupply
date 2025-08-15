pub mod delete;
pub mod insert;
pub mod query;
pub mod save_goods_received_lines;
pub mod update;
pub mod validate;

use repository::{
    goods_received_row::GoodsReceivedRow, GoodsReceivedLine, GoodsReceivedLineFilter,
    GoodsReceivedLineRow, GoodsReceivedLineSort, PaginationOption, RepositoryError,
};

use crate::{
    goods_received_line::{
        delete::{delete_goods_received_line, DeleteGoodsReceivedLineError},
        insert::{
            insert_goods_received_line, insert_goods_received_lines_from_purchase_order,
            InsertGoodsReceivedLineError, InsertGoodsReceivedLineInput,
            InsertGoodsReceivedLinesError, InsertGoodsReceivedLinesFromPurchaseOrderInput,
        },
        query::{get_goods_received_line, get_goods_received_lines},
        save_goods_received_lines::{
            save_goods_received_lines, SaveGoodsReceivedLinesError, SaveGoodsReceivedLinesInput,
        },
        update::{
            update_goods_received_line, UpdateGoodsReceivedLineError, UpdateGoodsReceivedLineInput,
        },
    },
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
        store_id_option: Option<&str>,
        pagination: Option<PaginationOption>,
        filter: Option<GoodsReceivedLineFilter>,
        sort: Option<GoodsReceivedLineSort>,
    ) -> Result<ListResult<GoodsReceivedLine>, ListError> {
        get_goods_received_lines(ctx, store_id_option, pagination, filter, sort)
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

    fn update_goods_received_line(
        &self,
        ctx: &ServiceContext,
        input: UpdateGoodsReceivedLineInput,
    ) -> Result<GoodsReceivedLineRow, UpdateGoodsReceivedLineError> {
        update_goods_received_line(ctx, input)
    }

    fn delete_goods_received_line(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<String, DeleteGoodsReceivedLineError> {
        delete_goods_received_line(ctx, id)
    }

    fn save_goods_received_lines(
        &self,
        ctx: &ServiceContext,
        input: SaveGoodsReceivedLinesInput,
    ) -> Result<GoodsReceivedRow, SaveGoodsReceivedLinesError> {
        save_goods_received_lines(ctx, input)
    }
}

pub struct GoodsReceivedLineService;
impl GoodsReceivedLineServiceTrait for GoodsReceivedLineService {}
