use repository::goods_received::{GoodsReceivedFilter, GoodsReceivedSort};
use repository::goods_received_row::GoodsReceivedRow;
use repository::{PaginationOption, RepositoryError};

use crate::goods_received::query::{get_goods_received, get_goods_received_list};
use crate::service_provider::ServiceContext;
use crate::{ListError, ListResult};

pub mod query;

pub trait GoodsReceivedServiceTrait: Sync + Send {
    fn get_one_goods_received(
        &self,
        ctx: &ServiceContext,
        _store_id: &str, // TODO?
        id: &str,
    ) -> Result<Option<GoodsReceivedRow>, RepositoryError> {
        get_goods_received(ctx, id)
    }

    fn get_goods_received_list(
        &self,
        ctx: &ServiceContext,
        _store_id: &str, // TODO?
        pagination: Option<PaginationOption>,
        filter: Option<GoodsReceivedFilter>,
        sort: Option<GoodsReceivedSort>,
    ) -> Result<ListResult<GoodsReceivedRow>, ListError> {
        get_goods_received_list(ctx, pagination, filter, sort)
    }
}

pub struct GoodsReceivedService;
impl GoodsReceivedServiceTrait for GoodsReceivedService {}
