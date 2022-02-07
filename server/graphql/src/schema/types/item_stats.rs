use async_graphql::*;
pub struct ItemStats {}

#[Object]
impl ItemStats {
    pub async fn average_monthly_consumption(&self) -> f64 {
        todo!()
    }

    pub async fn stock_on_hand(&self) -> u32 {
        todo!()
    }

    pub async fn months_of_stock(&self) -> f64 {
        todo!()
    }
}
