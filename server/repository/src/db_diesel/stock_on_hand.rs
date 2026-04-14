use super::StorageConnection;

use crate::{diesel_macros::apply_equal_filter, item_link, EqualFilter, RepositoryError};
use diesel::prelude::*;

// Points to the store_stock_on_hand view (no cross join, only items with stock).
// The legacy stock_on_hand view (with item x store cross join) is kept for external consumers.
// NOTE: This view only returns rows for items that have stock (available or total > 0).
// Items with no stock lines will NOT appear. Callers must default to 0 for missing items.
table! {
    store_stock_on_hand (id) {
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

joinable!(store_stock_on_hand -> item_link (item_id));
allow_tables_to_appear_in_same_query!(item_link, store_stock_on_hand);

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
        let mut query = store_stock_on_hand::table.into_boxed();

        if let Some(f) = filter {
            let StockOnHandFilter { item_id, store_id } = f;

            apply_equal_filter!(query, item_id, store_stock_on_hand::item_id);
            apply_equal_filter!(query, store_id, store_stock_on_hand::store_id);
        }

        // Debug diesel query
        // log::info!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let result = query.load::<StockOnHandRow>(self.connection.lock().connection())?;

        Ok(result)
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
