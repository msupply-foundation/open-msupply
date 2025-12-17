use crate::{
    diesel_macros::apply_equal_filter, Dos, EqualFilter, RepositoryError, StorageConnection,
};
use chrono::NaiveDate;
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

#[derive(Clone, Debug, PartialEq, Default, TS, Serialize, Deserialize)]
pub struct DaysOutOfStockFilter {
    #[ts(optional)]
    pub store_id: Option<EqualFilter<String>>,
    #[ts(optional)]
    pub item_id: Option<EqualFilter<String>>,
    // Will consider start of the day
    pub from: NaiveDate,
    // Will consider end of the day
    pub to: NaiveDate,
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
        filter: DaysOutOfStockFilter,
    ) -> Result<Vec<DaysOutOfStockRow>, RepositoryError> {
        let DaysOutOfStockFilter {
            item_id,
            store_id,
            from,
            to,
        } = filter;

        // Build filter_helper query for any present fields
        let mut filter_helper_query = dos_filter_helper::table.into_boxed();

        apply_equal_filter!(filter_helper_query, item_id, dos_filter_helper::item_id);

        apply_equal_filter!(filter_helper_query, store_id, dos_filter_helper::store_id);

        let dos_query = Dos {
            from,
            to,
            filter_helper: filter_helper_query,
        }
        .as_dos_query()?;

        // Debug
        println!("{}", diesel::debug_query::<crate::DBType, _>(&dos_query));

        Ok(dos_query.load::<DaysOutOfStockRow>(self.connection.lock().connection())?)
    }
}

#[cfg(test)]

pub(crate) mod test {
    use chrono::{Duration, NaiveDateTime, Timelike};
    use util::{date_now, date_with_offset, datetime_now, get_local_date_as_utc};

    use super::*;

    use crate::mock::test_helpers::{make_movements_extended, MakeMovements};
    use crate::mock::MockData;
    use crate::{
        mock::{mock_item_a, mock_store_a, MockDataInserts},
        test_db::setup_all_with_data,
    };
    use crate::{EqualFilter, StockLineRow};

    async fn test_one(
        test_name: &str,
        reference_date: NaiveDateTime,
        movements: Vec<(i64, i64)>,
        expected_dos: Option<f64>,
    ) {
        let test_stock_line = StockLineRow {
            id: format!("test_stock_line_{test_name}"),
            item_link_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            ..Default::default()
        };

        let mock_data = MockData {
            stock_lines: vec![test_stock_line.clone()],
            ..Default::default()
        }
        .join(make_movements_extended(MakeMovements {
            stock_line: test_stock_line,
            date_quantity: movements,
            reference_datetime: reference_date,
            offset_days: 30,
        }));

        let (_, connection, _, _) = setup_all_with_data(
            &format!("test_dose_{test_name}"),
            MockDataInserts::none().names().stores().units().items(),
            mock_data,
        )
        .await;

        let end_date = date_now();
        // Using a short DOS period so that stock movements can be created beforehand
        let start_date = date_with_offset(&end_date, Duration::days(-10));
        let store_id = mock_store_a().id.clone();
        let repo = DaysOutOfStockRepository::new(&connection);

        std::env::set_var("TZ", "Pacific/Auckland");

        // Set timezone, otherwise would use whatever is configured in postgres system
        if cfg!(feature = "postgres") {
            diesel::sql_query("SET TIME ZONE 'Pacific/Auckland';")
                .execute(connection.lock().connection())
                .unwrap();
        }

        let result = repo
            .query(DaysOutOfStockFilter {
                item_id: Some(EqualFilter::equal_any(vec![mock_item_a().id])),
                store_id: Some(EqualFilter::equal_to(store_id.to_string())),
                from: start_date,
                to: end_date,
            })
            .unwrap();

        std::env::set_var("TZ", "");

        let Some(expected_dos) = expected_dos else {
            assert_eq!(
                result.len(),
                0,
                "Expected no DOS result for test {test_name}"
            );
            return;
        };

        assert_eq!(
            result.len(),
            1,
            "Expected one DOS result for test {test_name}"
        );
        let actual = result[0].total_dos;
        assert_eq!(
            actual, expected_dos,
            "DOS mismatch for test {test_name}, expected {expected_dos}, got {actual}"
        );
    }

    #[actix_rt::test]

    async fn test_dos() {
        let reference_date = get_local_date_as_utc(datetime_now());

        test_one(
            "multiple_periods",
            reference_date,
            vec![(10, 3), (22, -3), (25, 3), (26, -3)],
            /*
            Looking back 10 days from 30th, including 20th in calculation
            +------------------------+----+----+----+-----+-----+----+----+-----+-----+-----+-----+
            |                        | 20 | 21 | 22 | 23  | 24  | 25 | 26 | 27  | 28  | 29  | 30  |
            +------------------------+----+----+----+-----+-----+----+----+-----+-----+-----+-----+
            | end of day balance     | 3  | 3  | 0  | 0   | 0   | 3  | 0  | 0   | 0   | 0   | 0   |
            +------------------------+----+----+----+-----+-----+----+----+-----+-----+-----+-----+
            | full day without stock | no | no | no | yes | yes | no | no | yes | yes | yes | yes |
            +------------------------+----+----+----+-----+-----+----+----+-----+-----+-----+-----+
            https://www.tablesgenerator.com/text_tables (file -> paste table data)
            */
            Some(6.0),
        )
        .await;

        test_one(
            "out_of_stock_at_start",
            reference_date,
            vec![(5, 10), (6, -10), (25, 10)],
            /*
            Looking back 10 days from 30th, including 20th in calculation
            +------------------------+----+-----+-----+-----+-----+-----+----+----+----+----+----+----+
            |                        | 19 | 20  | 21  | 22  | 23  | 24  | 25 | 26 | 27 | 28 | 29 | 30 |
            +------------------------+----+-----+-----+-----+-----+-----+----+----+----+----+----+----+
            | end of day balance     | 0  | 0   | 0   | 0   | 0   | 0   | 10 | 10 | 10 | 10 | 10 | 10 |
            +------------------------+----+-----+-----+-----+-----+-----+----+----+----+----+----+----+
            | full day without stock | no | yes | yes | yes | yes | yes | no | no | no | no | no | no |
            +------------------------+----+-----+-----+-----+-----+-----+----+----+----+----+----+----+
            https://www.tablesgenerator.com/text_tables (file -> paste table data)
                        */
            Some(5.0),
        )
        .await;

        test_one(
            "out_of_stock_at_end",
            reference_date,
            vec![(10, 6), (26, -6)],
            /*
            Looking back 10 days from 30th, including 20th in calculation
            +------------------------+----+----+----+----+----+----+----+----+-----+-----+-----+-----+
            |                        | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27  | 28  | 29  | 30  |
            +------------------------+----+----+----+----+----+----+----+----+-----+-----+-----+-----+
            | end of day balance     | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 0  | 0   | 0   | 0   | 0   |
            +------------------------+----+----+----+----+----+----+----+----+-----+-----+-----+-----+
            | full day without stock |    | no | no | no | no | no | no | no | yes | yes | yes | yes |
            +------------------------+----+----+----+----+----+----+----+----+-----+-----+-----+-----+
            https://www.tablesgenerator.com/text_tables (file -> paste table data)
            */
            Some(4.0),
        )
        .await;

        test_one(
            "out_of_stock_start_and_end",
            reference_date,
            vec![(5, 10), (6, -10), (24, 4), (25, -4)],
            /*
            Looking back 10 days from 30th, including 20th in calculation
            +------------------------+----+-----+-----+-----+-----+----+----+-----+-----+-----+-----+-----+
            |                        | 19 | 20  | 21  | 22  | 23  | 24 | 25 | 26  | 27  | 28  | 29  | 30  |
            +------------------------+----+-----+-----+-----+-----+----+----+-----+-----+-----+-----+-----+
            | end of day balance     | 0  | 0   | 0   | 0   | 0   | 10 | 0  | 0   | 0   | 0   | 0   | 0   |
            +------------------------+----+-----+-----+-----+-----+----+----+-----+-----+-----+-----+-----+
            | full day without stock |    | yes | yes | yes | yes | no | no | yes | yes | yes | yes | yes |
            +------------------------+----+-----+-----+-----+-----+----+----+-----+-----+-----+-----+-----+
            https://www.tablesgenerator.com/text_tables (file -> paste table data)
            */
            Some(9.0),
        )
        .await;

        test_one(
            "fully_out_of_stock",
            reference_date,
            vec![(5, 10), (6, -10)],
            /*
            Looking back 10 days from 30th, including 20th in calculation
            +------------------------+----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
            |                        | 19 | 20  | 21  | 22  | 23  | 24  | 25  | 26  | 27  | 28  | 29  | 30  |
            +------------------------+----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
            | end of day balance     | 0  | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   |
            +------------------------+----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
            | full day without stock |    | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
            +------------------------+----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
            11 days out of stock
            https://www.tablesgenerator.com/text_tables (file -> paste table data)
            */
            Some(11.0),
        )
        .await;

        test_one("in_stock_whole_time", reference_date, vec![(5, 10)], None).await;

        let out_of_stock_first_day = vec![(5, 10), (20, -10)];
        test_one(
            "out_of_stock_first_day",
            reference_date,
            out_of_stock_first_day.clone(),
            /*
            Looking back 10 days from 30th, including 20th in calculation
            +------------------------+----+----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
            |                        | 19 | 20 | 21  | 22  | 23  | 24  | 25  | 26  | 27  | 28  | 29  | 30  |
            +------------------------+----+----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
            | end of day balance     | 10 | 0  | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   |
            +------------------------+----+----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
            | full day without stock |    | no | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
            +------------------------+----+----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
            9 days out of stock
            https://www.tablesgenerator.com/text_tables (file -> paste table data)
            */
            Some(10.0),
        )
        .await;

        // If reference time is 23:00 UTC and local timezone iz 'Pacific/Auckland' then 20th will be 21st
        // making previous data lead to 9 days out of stock instead of 10
        let reference_date = datetime_now().with_hour(23).unwrap();

        test_one(
            "out_of_stock_timezone",
            reference_date,
            out_of_stock_first_day,
            Some(9.0),
        )
        .await;
    }
}
