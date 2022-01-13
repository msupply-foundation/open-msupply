use async_graphql::*;
use chrono::NaiveDateTime;
use repository::schema::StockTakeRow;
use serde::Serialize;

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[graphql(remote = "repository::schema::StockTakeStatus")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum StockTakeNodeStatus {
    New,
    Finalised,
}

pub struct StockTakeNode {
    pub stock_take: StockTakeRow,
}

#[Object]
impl StockTakeNode {
    pub async fn id(&self) -> &str {
        &self.stock_take.id
    }

    pub async fn store_id(&self) -> &str {
        &self.stock_take.store_id
    }

    pub async fn stock_take_number(&self) -> i64 {
        self.stock_take.stock_take_number
    }

    pub async fn comment(&self) -> &Option<String> {
        &self.stock_take.comment
    }

    pub async fn description(&self) -> &Option<String> {
        &self.stock_take.description
    }

    pub async fn status(&self) -> StockTakeNodeStatus {
        StockTakeNodeStatus::from(self.stock_take.status.clone())
    }

    pub async fn created_datetime(&self) -> &NaiveDateTime {
        &self.stock_take.created_datetime
    }

    pub async fn finalised_datetime(&self) -> &Option<NaiveDateTime> {
        &self.stock_take.finalised_datetime
    }

    pub async fn inventory_adjustment_id(&self) -> &Option<String> {
        &self.stock_take.inventory_adjustment_id
    }
}
