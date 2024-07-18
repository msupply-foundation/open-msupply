#[cfg(test)]
mod query {
    use chrono::NaiveDate;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, StockLineFilter, StockLineSortField,
    };
    use repository::{EqualFilter, PaginationOption, Sort};
    use std::cmp::Ordering;

    use crate::{service_provider::ServiceProvider, ListError, SingleRecordError};

    #[actix_rt::test]
    async fn get_schedules_with_next_periods_by_program_success() {
        let (_, _, connection_manager, _) = setup_all(
            "get_schedules_with_next_periods_by_program_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.stock_line_service;

        assert_eq!(
            service.get_stock_lines(
                &context,
                Some(PaginationOption {
                    limit: Some(2000),
                    offset: None
                }),
                None,
                None,
                None,
            ),
            Err(ListError::LimitAboveMax(1000))
        );

        assert_eq!(
            service.get_stock_lines(
                &context,
                Some(PaginationOption {
                    limit: Some(0),
                    offset: None,
                }),
                None,
                None,
                None,
            ),
            Err(ListError::LimitBelowMin(1))
        );
    }

    #[actix_rt::test]
    async fn stock_line_service_single_record() {
        let (_, _, connection_manager, _) =
            setup_all("test_stock_line_single_record", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.stock_line_service;

        assert_eq!(
            service.get_stock_line(&context, "invalid_id".to_owned()),
            Err(SingleRecordError::NotFound("invalid_id".to_owned()))
        );

        let result = service
            .get_stock_line(&context, "stock_line_on_hold".to_owned())
            .unwrap();

        assert_eq!(result.stock_line_row.id, "stock_line_on_hold");
        assert_eq!(result.stock_line_row.on_hold, true);
    }

    #[actix_rt::test]
    async fn stock_line_service_filter() {
        let (_, _, connection_manager, _) =
            setup_all("test_stock_line_filter", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.stock_line_service;

        let result = service
            .get_stock_lines(
                &context,
                None,
                Some(StockLineFilter::new().id(EqualFilter::equal_to("item_a_line_a"))),
                None,
                None,
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(result.rows[0].stock_line_row.id, "item_a_line_a");

        let result = service
            .get_stock_lines(
                &context,
                None,
                Some(StockLineFilter::new().id(EqualFilter::equal_any(vec![
                    "item_a_line_a".to_owned(),
                    "item_a_line_b".to_owned(),
                ]))),
                None,
                None,
            )
            .unwrap();

        assert_eq!(result.count, 2);
        assert_eq!(result.rows[0].stock_line_row.id, "item_a_line_a");
        assert_eq!(result.rows[1].stock_line_row.id, "item_a_line_b");
    }

    fn order_dates_with_nulls_last(a: &Option<NaiveDate>, b: &Option<NaiveDate>) -> Ordering {
        match (a, b) {
            (Some(a), Some(b)) => a.cmp(b),
            (Some(_), None) => Ordering::Less,
            (None, Some(_)) => Ordering::Greater,
            (None, None) => Ordering::Equal,
        }
    }
    fn order_dates_with_nulls_first(a: &Option<NaiveDate>, b: &Option<NaiveDate>) -> Ordering {
        match (a, b) {
            (Some(a), Some(b)) => b.cmp(a),
            (Some(_), None) => Ordering::Greater,
            (None, Some(_)) => Ordering::Less,
            (None, None) => Ordering::Equal,
        }
    }

    #[actix_rt::test]
    async fn stock_line_service_sort() {
        let (mock_data, _, connection_manager, _) =
            setup_all("test_stock_line_sort", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.stock_line_service;
        let mut stock_lines = mock_data["base"].stock_lines.clone();
        let filter = Some(StockLineFilter {
            id: Some(EqualFilter::equal_any(
                stock_lines
                    .clone()
                    .into_iter()
                    .map(|stock_line| stock_line.id)
                    .collect(),
            )),
            item_id: None,
            location_id: None,
            is_available: None,
            expiry_date: None,
            store_id: None,
            item_code_or_name: None,
            has_packs_in_store: None,
            location: None,
        });

        // Test ExpiryDate sort with default sort order
        let result = service
            .get_stock_lines(
                &context,
                None,
                filter,
                Some(Sort {
                    key: StockLineSortField::ExpiryDate,
                    desc: None,
                }),
                None,
            )
            .unwrap();

        stock_lines.sort_by(|a, b| order_dates_with_nulls_last(&a.expiry_date, &b.expiry_date));

        let result_expiry_dates: Vec<String> = result
            .rows
            .into_iter()
            .map(|stock_line| match stock_line.stock_line_row.expiry_date {
                Some(date) => date.format("%Y-%m-%d").to_string(),
                None => "".to_string(),
            })
            .collect();
        let sorted_expiry_dates: Vec<String> = stock_lines
            .into_iter()
            .map(|stock_line| match stock_line.expiry_date {
                Some(date) => date.format("%Y-%m-%d").to_string(),
                None => "".to_string(),
            })
            .collect();

        assert_eq!(result_expiry_dates, sorted_expiry_dates);

        let mut stock_lines = mock_data["base"].stock_lines.clone();
        let filter = Some(StockLineFilter {
            id: Some(EqualFilter::equal_any(
                stock_lines
                    .clone()
                    .into_iter()
                    .map(|stock_line| stock_line.id)
                    .collect(),
            )),
            item_id: None,
            location_id: None,
            is_available: None,
            expiry_date: None,
            store_id: None,
            item_code_or_name: None,
            has_packs_in_store: None,
            location: None,
        });

        // Test ExpiryDate sort with desc sort order
        let result = service
            .get_stock_lines(
                &context,
                None,
                filter,
                Some(Sort {
                    key: StockLineSortField::ExpiryDate,
                    desc: Some(true),
                }),
                None,
            )
            .unwrap();

        stock_lines.sort_by(|a, b| order_dates_with_nulls_first(&a.expiry_date, &b.expiry_date));

        let result_expiry_dates: Vec<String> = result
            .rows
            .into_iter()
            .map(|stock_line| match stock_line.stock_line_row.expiry_date {
                Some(date) => date.format("%Y-%m-%d").to_string(),
                None => "".to_string(),
            })
            .collect();
        let sorted_expiry_dates: Vec<String> = stock_lines
            .into_iter()
            .map(|stock_line| match stock_line.expiry_date {
                Some(date) => date.format("%Y-%m-%d").to_string(),
                None => "".to_string(),
            })
            .collect();

        assert_eq!(result_expiry_dates, sorted_expiry_dates);
    }
}
