use async_graphql::{Context, Object, SimpleObject};
use chrono::{DateTime, Utc};
use std::convert::TryInto;

use crate::database::schema::StockLineRow;

#[derive(SimpleObject, PartialEq, Debug)]
#[graphql(name = "StockLine")]
pub struct StockLineQuery {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub batch: Option<String>,
    pub pack_size: i32,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub available_number_of_packs: i32,
    pub total_number_of_packs: i32,
    pub expiry_date: Option<String>,
}

impl From<StockLineRow> for StockLineQuery {
    fn from(
        StockLineRow {
            id,
            item_id,
            store_id,
            batch,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            available_number_of_packs,
            total_number_of_packs,
            expiry_date,
        }: StockLineRow,
    ) -> Self {
        StockLineQuery {
            id,
            item_id,
            store_id,
            batch,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            available_number_of_packs,
            total_number_of_packs,
            expiry_date: expiry_date.map(|v| DateTime::<Utc>::from_utc(v, Utc).to_rfc3339()),
        }
    }
}

pub struct StockLineList {
    pub stock_lines: Vec<StockLineQuery>,
}

#[Object]
impl StockLineList {
    async fn total_count(&self, _ctx: &Context<'_>) -> i64 {
        // TODO part of error handling no unwraps
        self.stock_lines.len().try_into().unwrap()
    }

    async fn nodes(&self, _ctx: &Context<'_>) -> &Vec<StockLineQuery> {
        &self.stock_lines
    }
}
