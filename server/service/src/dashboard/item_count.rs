use std::convert::TryInto;

use repository::{ItemFilter, ItemRepository, RepositoryError};

use crate::{item_stats::get_item_stats, service_provider::ServiceContext};

pub struct ItemCounts {
    pub total: i64,
    pub no_stock: i64,
    pub low_stock: i64,
}

pub trait ItemCountServiceTrait: Send + Sync {
    /// # Arguments
    ///
    /// * i32 threshold number of months below which is considered low stock
    fn get_item_counts(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        low_stock_threshold: i32,
    ) -> Result<ItemCounts, RepositoryError> {
        ItemServiceCount {}.get_item_counts(ctx, store_id, low_stock_threshold)
    }
}

pub struct ItemServiceCount {}

impl ItemCountServiceTrait for ItemServiceCount {
    fn get_item_counts(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        low_stock_threshold: i32,
    ) -> Result<ItemCounts, RepositoryError> {
        let repo = ItemRepository::new(&ctx.connection);
        let total = match repo.count(Some(ItemFilter::new().match_is_visible(true))) {
            Ok(total) => total,
            Err(error) => return Err(error),
        };

        let no_stock =
            match repo.count_no_stock(Some(ItemFilter::new().match_is_visible(true)), store_id) {
                Ok(no_stock) => no_stock,
                Err(error) => return Err(error),
            };

        let item_stats = get_item_stats(ctx, store_id, None, None)
            .unwrap()
            .into_iter()
            .filter(|item| {
                item.average_monthly_consumption != 0.0
                    && item.available_stock_on_hand as f64 / item.average_monthly_consumption
                        < low_stock_threshold as f64
            });

        let low_stock: i64 = match item_stats.count().try_into() {
            Ok(low_stock) => low_stock,
            Err(error) => {
                return Err(RepositoryError::DBError {
                    msg: error.to_string(),
                    extra: "".to_string(),
                })
            }
        };

        Ok(ItemCounts {
            total,
            no_stock,
            low_stock,
        })
    }
}
