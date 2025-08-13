use crate::goods_received::query::{get_goods_received, get_goods_received_list};
use crate::service_provider::ServiceContext;
use crate::{ListError, ListResult};
use repository::{
    goods_received::{GoodsReceivedFilter, GoodsReceivedSort},
    goods_received_row::GoodsReceivedRow,
    PaginationOption, RepositoryError,
};

mod common;
pub mod delete;
pub mod insert;
pub mod query;

pub use delete::{delete_goods_received, DeleteGoodsReceivedError};
use insert::{insert_goods_received, InsertGoodsReceivedError, InsertGoodsReceivedInput};

pub trait GoodsReceivedServiceTrait: Sync + Send {
    fn get_one_goods_received(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        id: &str,
    ) -> Result<Option<GoodsReceivedRow>, RepositoryError> {
        get_goods_received(ctx, store_id, id)
    }

    fn get_goods_received_list(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        pagination: Option<PaginationOption>,
        filter: Option<GoodsReceivedFilter>,
        sort: Option<GoodsReceivedSort>,
    ) -> Result<ListResult<GoodsReceivedRow>, ListError> {
        get_goods_received_list(ctx, store_id, pagination, filter, sort)
    }

    fn insert_goods_received(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: InsertGoodsReceivedInput,
    ) -> Result<GoodsReceivedRow, InsertGoodsReceivedError> {
        insert_goods_received(ctx, store_id, input)
    }

    fn delete_goods_received(
        &self,
        ctx: &ServiceContext,
        goods_receiving_id: &str,
    ) -> Result<String, DeleteGoodsReceivedError> {
        delete_goods_received(ctx, goods_receiving_id)
    }
}

pub struct GoodsReceivedService;
impl GoodsReceivedServiceTrait for GoodsReceivedService {}
