use super::{stock_on_hand::stock_on_hand::dsl as stock_on_hand_dsl, StorageConnection};

use crate::{diesel_macros::apply_equal_filter, item_link, EqualFilter, RepositoryError};
use diesel::prelude::*;

table! {
    stock_on_hand (id) {
        id -> Text,
        item_id -> Text,
        item_name -> Text,
        store_id -> Text,
        available_stock_on_hand -> Double,
        total_stock_on_hand -> Double,
    }
}

#[derive(Clone, Queryable, Debug, PartialEq)]
pub struct StockOnHandRow {
    pub id: String,
    pub item_id: String,
    pub item_name: String,
    pub store_id: String,
    pub available_stock_on_hand: f64,
    pub total_stock_on_hand: f64,
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct StockOnHandFilter {
    pub item_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
}

joinable!(stock_on_hand -> item_link (item_id));
allow_tables_to_appear_in_same_query!(item_link, stock_on_hand);

pub struct StockOnHandRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockOnHandRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockOnHandRepository { connection }
    }

    pub fn query_one(
        &self,
        filter: StockOnHandFilter,
    ) -> Result<Option<StockOnHandRow>, RepositoryError> {
        Ok(self.query(Some(filter))?.pop())
    }

    pub fn query(
        &self,
        filter: Option<StockOnHandFilter>,
    ) -> Result<Vec<StockOnHandRow>, RepositoryError> {
        // Query StockOnHand
        let mut query = stock_on_hand_dsl::stock_on_hand.into_boxed();

        if let Some(f) = filter {
            let StockOnHandFilter { item_id, store_id } = f;

            apply_equal_filter!(query, item_id, stock_on_hand_dsl::item_id);
            apply_equal_filter!(query, store_id, stock_on_hand_dsl::store_id);
        }

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        Ok(query.load::<StockOnHandRow>(self.connection.lock().connection())?)
    }
}

impl StockOnHandFilter {
    pub fn new() -> StockOnHandFilter {
        StockOnHandFilter::default()
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }
}
