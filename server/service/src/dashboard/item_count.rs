use std::{convert::TryInto, num::TryFromIntError};

use repository::{ItemFilter, ItemRepository, RepositoryError};

use crate::{item_stats::get_item_stats, service_provider::ServiceContext};

pub trait ItemCountServiceTrait: Send + Sync {
    fn count_total(&self, ctx: &ServiceContext) -> Result<i64, RepositoryError> {
        ItemServiceCount {}.count_total(ctx)
    }

    fn count_no_stock(&self, ctx: &ServiceContext, store_id: &str) -> Result<i64, RepositoryError> {
        ItemServiceCount {}.count_no_stock(ctx, store_id)
    }

    /// # Arguments
    ///
    /// * i32 threshold number of months below which is considered low stock
    fn count_low_stock(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        low_stock_threshold: i32,
    ) -> Result<i64, TryFromIntError> {
        ItemServiceCount {}.count_low_stock(ctx, store_id, low_stock_threshold)
    }
}

pub struct ItemServiceCount {}

impl ItemCountServiceTrait for ItemServiceCount {
    fn count_total(&self, ctx: &ServiceContext) -> Result<i64, RepositoryError> {
        let repo = ItemRepository::new(&ctx.connection);
        repo.count(Some(ItemFilter::new().match_is_visible(true)))
    }

    fn count_no_stock(&self, ctx: &ServiceContext, store_id: &str) -> Result<i64, RepositoryError> {
        let repo = ItemRepository::new(&ctx.connection);
        repo.count_no_stock(Some(ItemFilter::new().match_is_visible(true)), store_id)
    }

    fn count_low_stock(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        low_stock_threshold: i32,
    ) -> Result<i64, TryFromIntError> {
        let item_stats = get_item_stats(ctx, store_id, None, None)
            .unwrap()
            .into_iter()
            .filter(|item| {
                item.average_monthly_consumption != 0.0
                    && item.available_stock_on_hand as f64 / item.average_monthly_consumption
                        <= low_stock_threshold as f64
            });

        item_stats.count().try_into()
    }
}
