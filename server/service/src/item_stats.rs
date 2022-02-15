use chrono::NaiveDateTime;
use repository::{ItemStats, ItemStatsFilter, ItemStatsRepository, RepositoryError};

use crate::service_provider::ServiceContext;

pub trait ItemStatsServiceTrait: Sync + Send {
    fn get_item_stats(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        look_back_datetime: Option<NaiveDateTime>,
        filter: Option<ItemStatsFilter>,
    ) -> Result<Vec<ItemStats>, RepositoryError> {
        let repository = ItemStatsRepository::new(&ctx.connection);

        repository.query(store_id, look_back_datetime, filter)
    }
}
pub struct ItemStatsService {}
impl ItemStatsServiceTrait for ItemStatsService {}
