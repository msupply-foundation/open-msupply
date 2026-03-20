use async_graphql::*;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};
use service::item_stats::ItemStats;
use service::purchase_order_line::query::calculate_total_units_on_order;

pub struct ItemStatsNode {
    pub item_stats: ItemStats,
    pub store_id: String,
}

#[Object]
impl ItemStatsNode {
    pub async fn total_consumption(&self) -> f64 {
        self.item_stats.total_consumption
    }

    pub async fn average_monthly_consumption(&self) -> f64 {
        self.item_stats.average_monthly_consumption
    }

    pub async fn available_stock_on_hand(&self) -> f64 {
        self.item_stats.available_stock_on_hand
    }

    pub async fn stock_on_hand(&self) -> f64 {
        self.item_stats.total_stock_on_hand
    }

    pub async fn available_months_of_stock_on_hand(&self) -> Option<f64> {
        (self.item_stats.average_monthly_consumption != 0.0).then(|| {
            self.item_stats.available_stock_on_hand / self.item_stats.average_monthly_consumption
        })
    }

    pub async fn months_of_stock_on_hand(&self) -> Option<f64> {
        (self.item_stats.average_monthly_consumption != 0.0).then(|| {
            self.item_stats.total_stock_on_hand / self.item_stats.average_monthly_consumption
        })
    }

    pub async fn units_on_order(&self, ctx: &Context<'_>) -> Result<f64> {
        let connection_manager = ctx.get_connection_manager();
        let connection = connection_manager
            .connection()
            .map_err(|e| StandardGraphqlError::from_repository_error(e).extend())?;

        calculate_total_units_on_order(
            &connection,
            &self.item_stats.item_id,
            Some(&self.store_id),
        )
        .map_err(|e| StandardGraphqlError::from_repository_error(e).extend())
    }
}

impl ItemStatsNode {
    pub fn from_domain(item_stats: ItemStats, store_id: String) -> ItemStatsNode {
        ItemStatsNode {
            item_stats,
            store_id,
        }
    }
}
