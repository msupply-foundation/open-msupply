use async_graphql::*;
use repository::ItemStats;
pub struct ItemStatsNode {
    pub average_monthly_consumption: i32,
    pub stock_on_hand: i32,
}

#[Object]
impl ItemStatsNode {
    pub async fn average_monthly_consumption(&self) -> i32 {
        self.average_monthly_consumption
    }

    pub async fn stock_on_hand(&self) -> i32 {
        self.stock_on_hand
    }

    pub async fn months_of_stock(&self) -> f64 {
        if self.average_monthly_consumption == 0 {
            return self.stock_on_hand as f64;
        }
        self.stock_on_hand as f64 / self.average_monthly_consumption as f64
    }
}

impl ItemStatsNode {
    pub fn from_domain(item_stats: ItemStats) -> ItemStatsNode {
        ItemStatsNode {
            average_monthly_consumption: item_stats.average_monthly_consumption(),
            stock_on_hand: item_stats.stock_on_hand(),
        }
    }
}
