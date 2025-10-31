use super::consumption::*;
use diesel::prelude::*;

use crate::{
    diesel_macros::apply_equal_filter, DateFilter, Dos, RepositoryError, StorageConnection,
};

// Only used for dynamic query construction
// Not a queryable table outside of this
table! {
    #[sql_name = "stock_movement"]
    dos_filter_helper (item_id, store_id) {
        item_id -> Text,
        store_id -> Text
    }
}

table! {
    days_out_of_stock (item_id, store_id) {
        item_id -> Text,
        store_id -> Text,
        total_dos -> Double,
    }
}

#[derive(Clone, Queryable, Selectable, Debug, PartialEq, Default)]
#[diesel(table_name = days_out_of_stock)]
/// Row type for results from the days_out_of_stock table or dynamic DOS query.
pub struct DaysOutOfStockRow {
    pub item_id: String,
    pub store_id: String,
    pub total_dos: f64,
}

/// Repository for querying days out of stock statistics.
pub struct DaysOutOfStockRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DaysOutOfStockRepository<'a> {
    /// Create a new repository for days out of stock queries.
    pub fn new(connection: &'a StorageConnection) -> Self {
        DaysOutOfStockRepository { connection }
    }

    pub fn query(
        &self,
        filter: Option<ConsumptionFilter>,
    ) -> Result<Vec<DaysOutOfStockRow>, RepositoryError> {
        if let Some(f) = filter {
            let ConsumptionFilter {
                item_id,
                store_id,
                date,
            } = f;

            // Build filter_helper query for any present fields
            let mut filter_helper_query = dos_filter_helper::table.into_boxed();
            if let Some(ref item_id) = item_id {
                apply_equal_filter!(
                    filter_helper_query,
                    Some(item_id.clone()),
                    dos_filter_helper::item_id
                );
            }
            if let Some(ref store_id) = store_id {
                apply_equal_filter!(
                    filter_helper_query,
                    Some(store_id.clone()),
                    dos_filter_helper::store_id
                );
            }

            // If a date filter is provided and valid, use it; otherwise, return empty result
            let (start, end) = match date {
                Some(DateFilter {
                    after_or_equal_to: Some(start_date),
                    before_or_equal_to: Some(end_date),
                    ..
                }) => {
                    // Convert start_date and end_date to NaiveDateTime
                    // TODO: Can the query be changed to NaiveDate instead?
                    let start =
                        start_date.and_time(chrono::NaiveTime::from_hms_opt(0, 0, 0).unwrap());
                    let end =
                        end_date.and_time(chrono::NaiveTime::from_hms_opt(23, 59, 59).unwrap());
                    (start, end)
                }
                _ => {
                    // No valid date range filter: return empty result
                    return Ok(vec![]);
                }
            };

            let dos_query = Dos {
                start,
                end,
                filter_helper: filter_helper_query,
                dos_result: (),
            };

            // Run the dynamic query
            return Ok(dos_query.load::<DaysOutOfStockRow>(self.connection.lock().connection())?);
        }

        // If no filter, fallback to static table query
        Ok(days_out_of_stock::table
            .load::<DaysOutOfStockRow>(self.connection.lock().connection())?)
    }
}
