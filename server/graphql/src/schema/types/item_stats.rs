use async_graphql::*;
pub struct ItemStats {
    pub average_monthly_consumption: i32,
    pub stock_on_hand: i32,
}

#[Object]
impl ItemStats {
    pub async fn average_monthly_consumption(&self) -> i32 {
        self.average_monthly_consumption
    }

    pub async fn stock_on_hand(&self) -> i32 {
        self.stock_on_hand
    }

    pub async fn months_of_stock(&self) -> f64 {
        self.stock_on_hand as f64 / self.average_monthly_consumption as f64
    }
}
