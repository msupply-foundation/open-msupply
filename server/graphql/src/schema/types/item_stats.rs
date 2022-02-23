use async_graphql::*;
use repository::ItemStats;
pub struct ItemStatsNode {
    pub average_monthly_consumption: i32,
    pub available_stock_on_hand: i32,
}

#[Object]
impl ItemStatsNode {
    pub async fn average_monthly_consumption(&self) -> i32 {
        self.average_monthly_consumption
    }

    pub async fn available_stock_on_hand(&self) -> i32 {
        self.available_stock_on_hand
    }

    pub async fn available_months_of_stock_on_hand(&self) -> f64 {
        if self.average_monthly_consumption == 0 {
            return self.available_stock_on_hand as f64;
        }
        self.available_stock_on_hand as f64 / self.average_monthly_consumption as f64
    }
}

impl ItemStatsNode {
    pub fn from_domain(item_stats: ItemStats) -> ItemStatsNode {
        ItemStatsNode {
            average_monthly_consumption: item_stats.average_monthly_consumption(),
            available_stock_on_hand: item_stats.available_stock_on_hand(),
        }
    }
}
