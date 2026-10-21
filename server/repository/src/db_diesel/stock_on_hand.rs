use super::StorageConnection;

use crate::{
    EqualFilter, RepositoryError, db_diesel::item_row::item, diesel_macros::apply_equal_filter,
};
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

joinable!(store_stock_on_hand -> item (item_id));
allow_tables_to_appear_in_same_query!(item, store_stock_on_hand);

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

    /// Available stock on hand for one item in a store, counting ONLY the stock tagged
    /// with `campaign_id`.
    ///
    /// Deliberately mirrors the `store_stock_on_hand` view's arithmetic — the same
    /// `pack_size × available_number_of_packs` sum over the same rows — so a
    /// campaign-scoped figure and the unscoped one above are the SAME measure, just over
    /// a narrower set. It reads `stock_line` directly rather than the view because the
    /// view is already aggregated per item and store, with no campaign to filter on. A
    /// campaign with no stock of the item sums to 0, which is the honest answer: none of
    /// this item is held for that campaign.
    pub fn campaign_query_one(
        &self,
        store_id: &str,
        item_id: &str,
        campaign_id: &str,
    ) -> Result<f64, RepositoryError> {
        use crate::db_diesel::stock_line_row::stock_line;
        use diesel::dsl::sum;

        let total: Option<f64> = stock_line::table
            .filter(stock_line::store_id.eq(store_id))
            .filter(stock_line::item_id.eq(item_id))
            .filter(stock_line::campaign_id.eq(campaign_id))
            .select(sum(
                stock_line::pack_size * stock_line::available_number_of_packs
            ))
            .first(self.connection.lock().connection())?;

        Ok(total.unwrap_or(0.0))
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
