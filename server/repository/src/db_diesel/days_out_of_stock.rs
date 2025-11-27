use super::consumption::*;
use crate::{
    diesel_macros::apply_equal_filter, DateFilter, Dos, RepositoryError, StorageConnection,
};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

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

#[derive(Clone, Queryable, Selectable, Debug, PartialEq, Default, Serialize, Deserialize, TS)]
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

#[cfg(test)]

pub(crate) mod test {

    use std::ops::Neg;

    use chrono::Duration;
    use util::{date_now, date_with_offset};

    use super::*;

    use crate::mock::test_helpers::make_movements;
    use crate::mock::MockData;
    use crate::{
        mock::{
            mock_item_a, mock_item_b, mock_item_c, mock_item_d, mock_item_e, mock_item_f,
            mock_store_a, MockDataInserts,
        },
        test_db::setup_all_with_data,
    };
    use crate::{EqualFilter, StockLineRow};

    pub(crate) fn mock_data() -> MockData {
        let test_stock_line_a = StockLineRow {
            id: "test_stock_line_a".to_string(),
            item_link_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            ..Default::default()
        };
        let test_stock_line_b = StockLineRow {
            id: "test_stock_line_b".to_string(),
            item_link_id: mock_item_b().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            ..Default::default()
        };
        let test_stock_line_c = StockLineRow {
            id: "test_stock_line_c".to_string(),
            item_link_id: mock_item_c().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            ..Default::default()
        };
        let test_stock_line_d = StockLineRow {
            id: "test_stock_line_d".to_string(),
            item_link_id: mock_item_d().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            ..Default::default()
        };
        let test_stock_line_e = StockLineRow {
            id: "test_stock_line_e".to_string(),
            item_link_id: mock_item_e().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            ..Default::default()
        };
        let test_stock_line_f = StockLineRow {
            id: "test_stock_line_f".to_string(),
            item_link_id: mock_item_f().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            ..Default::default()
        };

        // Use make_movements to create days where the item is out of stock
        // Movements from day 0 - 21 are prior to the DOS calculation
        // Movements from day 22 - 30 inclusive are within the DOS calculation
        // DOS is calculated to 30 days
        let mock_data = MockData {
            stock_lines: vec![
                test_stock_line_a.clone(),
                test_stock_line_b.clone(),
                test_stock_line_c.clone(),
                test_stock_line_d.clone(),
                test_stock_line_e.clone(),
                test_stock_line_f.clone(),
            ],
            ..Default::default()
        }
        // Has multiple periods out of stock
        .join(make_movements(
            test_stock_line_a,
            vec![
                // (day, movement)
                (10, 3),
                // DOS calculation period
                (22, -3), // stock = zero for 2 days
                (25, 3),
                (26, -3), // stock = zero for 5 more days
            ],
        ))
        // Is out of stock at the beginning of the period
        .join(make_movements(
            test_stock_line_b,
            vec![
                (5, 10),
                (6, -10),
                // DOS calculation period
                (25, 10), // stock = zero for 5 days
            ],
        ))
        // Is out of stock at the end of the period
        .join(make_movements(
            test_stock_line_c,
            vec![
                (10, 6),
                // DOS calculation period
                (26, -6), // stock = zero for 4 days
            ],
        ))
        // Is out of stock at the start and end of the period
        .join(make_movements(
            test_stock_line_d,
            vec![
                (5, 10),
                (6, -10),
                // DOS calculation period
                // stock = zero for 2 days
                (24, 4),
                (25, -4), // stock = zero for 7 more days
            ],
        ))
        // Is out of stock - no movements during DOS period
        .join(make_movements(
            test_stock_line_e,
            vec![
                (5, 10),
                (6, -10),
                // DOS calculation period
                // stock = zero for 10 days
            ],
        ))
        // Is in stock - no movements during DOS period
        .join(make_movements(
            test_stock_line_f,
            vec![
                (5, 10),
                // DOS calculation period
                // stock = 10 for 10 days
            ],
        ));

        mock_data
    }

    #[actix_rt::test]

    async fn test_item_stats_with_dos() {
        let (_, connection, _, _) = setup_all_with_data(
            "test_item_stats_with_dos",
            MockDataInserts::none().names().stores().units().items(),
            mock_data(),
        )
        .await;

        let end_date = date_now();
        // Using a short DOS period so that stock movements can be created beforehand
        let start_date = date_with_offset(&end_date, Duration::days((10_i32).neg() as i64));
        let store_id = mock_store_a().id.clone();
        let repo = DaysOutOfStockRepository::new(&connection);

        let result = repo
            .query(Some(ConsumptionFilter {
                item_id: Some(EqualFilter::equal_any(vec![mock_item_a().id])),
                store_id: Some(EqualFilter::equal_to(&store_id)),
                date: Some(DateFilter::date_range(&start_date, &end_date)),
            }))
            .unwrap();
        assert_eq!(result[0].total_dos, 7.0);

        let result = repo
            .query(Some(ConsumptionFilter {
                item_id: Some(EqualFilter::equal_any(vec![mock_item_b().id])),
                store_id: Some(EqualFilter::equal_to(&store_id)),
                date: Some(DateFilter::date_range(&start_date, &end_date)),
            }))
            .unwrap();
        assert_eq!(result[0].total_dos, 5.0);

        let result = repo
            .query(Some(ConsumptionFilter {
                item_id: Some(EqualFilter::equal_any(vec![mock_item_c().id])),
                store_id: Some(EqualFilter::equal_to(&store_id)),
                date: Some(DateFilter::date_range(&start_date, &end_date)),
            }))
            .unwrap();
        assert_eq!(result[0].total_dos, 4.0);

        let result = repo
            .query(Some(ConsumptionFilter {
                item_id: Some(EqualFilter::equal_any(vec![mock_item_d().id])),
                store_id: Some(EqualFilter::equal_to(&store_id)),
                date: Some(DateFilter::date_range(&start_date, &end_date)),
            }))
            .unwrap();
        assert_eq!(result[0].total_dos, 9.0);

        let result = repo
            .query(Some(ConsumptionFilter {
                item_id: Some(EqualFilter::equal_any(vec![mock_item_e().id])),
                store_id: Some(EqualFilter::equal_to(&store_id)),
                date: Some(DateFilter::date_range(&start_date, &end_date)),
            }))
            .unwrap();
        assert_eq!(result[0].total_dos, 10.0);

        let result = repo
            .query(Some(ConsumptionFilter {
                item_id: Some(EqualFilter::equal_any(vec![mock_item_f().id])),
                store_id: Some(EqualFilter::equal_to(&store_id)),
                date: Some(DateFilter::date_range(&start_date, &end_date)),
            }))
            .unwrap();
        assert_eq!(result.len(), 0);
    }
}
