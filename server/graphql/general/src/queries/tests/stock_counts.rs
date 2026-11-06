mod tests {
    use async_graphql::EmptyMutation;
    use chrono::{Duration, Utc};
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test_with_data};
    use repository::{
        StockLineRow,
        mock::{MockData, MockDataInserts, mock_item_a, mock_store_a},
    };
    use serde_json::json;

    use crate::GeneralQueries;

    fn stock_line_expiring_in(id: &str, days: i64) -> StockLineRow {
        StockLineRow {
            id: id.to_string(),
            item_id: mock_item_a().id,
            store_id: mock_store_a().id,
            available_number_of_packs: 10.0,
            total_number_of_packs: 10.0,
            expiry_date: Some(Utc::now().date_naive() + Duration::days(days)),
            ..Default::default()
        }
    }

    // A batch is usable to the end of its expiry day (#1786), so a batch
    // expiring today counts as expiring soon, not expired.
    #[actix_rt::test]
    async fn test_graphql_stock_counts_expiry_day() {
        let (_, _, _, settings) = setup_graphql_test_with_data(
            GeneralQueries,
            EmptyMutation,
            "test_graphql_stock_counts_expiry_day",
            MockDataInserts::none().items().stores().names().units(),
            MockData {
                stock_lines: vec![
                    stock_line_expiring_in("expired_yesterday", -1),
                    stock_line_expiring_in("expiring_today", 0),
                    stock_line_expiring_in("expiring_tomorrow", 1),
                ],
                ..Default::default()
            },
        )
        .await;

        // timezoneOffset 0 keeps "today" the same UTC day the lines are dated from
        let query = r#"
        query {
          stockCounts(storeId: \"store_a\", timezoneOffset: 0, daysTillExpired: 30) {
            expired
            expiringSoon
          }
        }
        "#;

        let expected = json!({
            "stockCounts": {
                "expired": 1,
                "expiringSoon": 2
            }
        });

        assert_graphql_query!(&settings, query, &None, &expected, None);
    }
}
