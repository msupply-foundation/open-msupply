use chrono::NaiveDateTime;
use repository::{schema::StocktakeStatus, Stocktake};

use async_graphql::*;

pub mod batch;
pub mod delete;
pub mod insert;
pub mod line;
pub mod update;

pub struct StocktakeNode {
    pub stocktake: Stocktake,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum StocktakeNodeStatus {
    New,
    Finalised,
}

impl StocktakeNodeStatus {
    pub fn to_domain(&self) -> StocktakeStatus {
        match self {
            StocktakeNodeStatus::New => StocktakeStatus::New,
            StocktakeNodeStatus::Finalised => StocktakeStatus::Finalised,
        }
    }
}

fn from_domain(status: &StocktakeStatus) -> StocktakeNodeStatus {
    match status {
        StocktakeStatus::New => StocktakeNodeStatus::New,
        StocktakeStatus::Finalised => StocktakeNodeStatus::Finalised,
    }
}

#[Object]
impl StocktakeNode {
    pub async fn id(&self) -> &str {
        &self.stocktake.id
    }

    pub async fn store_id(&self) -> &str {
        &self.stocktake.store_id
    }

    pub async fn stocktake_number(&self) -> i64 {
        self.stocktake.stocktake_number
    }

    pub async fn comment(&self) -> &Option<String> {
        &self.stocktake.comment
    }

    pub async fn description(&self) -> &Option<String> {
        &self.stocktake.description
    }

    pub async fn status(&self) -> StocktakeNodeStatus {
        from_domain(&self.stocktake.status)
    }

    pub async fn created_datetime(&self) -> NaiveDateTime {
        self.stocktake.created_datetime
    }

    pub async fn finalised_datetime(&self) -> Option<NaiveDateTime> {
        self.stocktake.finalised_datetime
    }

    pub async fn inventory_adjustment_id(&self) -> &Option<String> {
        &self.stocktake.inventory_adjustment_id
    }
}
