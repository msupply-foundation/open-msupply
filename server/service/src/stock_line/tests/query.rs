#[cfg(test)]
mod query {
    use repository::{
        mock::MockDataInserts, test_db::setup_all, StockLineFilter, StockLineSortField,
    };
    use repository::{EqualFilter, PaginationOption, Sort};

    use crate::{service_provider::ServiceProvider, ListError, SingleRecordError};

    #[actix_rt::test]
    async fn stock_line_service_pagination() {
        let (_, _, connection_manager, _) =
            setup_all("test_stock_line_service_pagination", MockDataInserts::all()).await;

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
            service.get_stock_line(&connection_manager.clone(), "invalid_id".to_owned()),
            Err(SingleRecordError::NotFound("invalid_id".to_owned()))
        );

        let result = service
            .get_stock_line(&connection_manager, "stock_line_on_hold".to_owned())
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
            )
            .unwrap();

        assert_eq!(result.count, 2);
        assert_eq!(result.rows[0].stock_line_row.id, "item_a_line_a");
        assert_eq!(result.rows[1].stock_line_row.id, "item_a_line_b");
    }

    // #[actix_rt::test]
    // async fn stock_line_service_sort() {
    //     let (mock_data, _, connection_manager, _) =
    //         setup_all("test_stock_line_sort", MockDataInserts::all()).await;

    //     let service_provider = ServiceProvider::new(connection_manager, "app_data");
    //     let context = service_provider.basic_context().unwrap();
    //     let service = service_provider.stock_line_service;
    //     // Test Name sort with default sort order
    //     let result = service
    //         .get_stock_lines(
    //             &context,
    //             None,
    //             None,
    //             Some(Sort {
    //                 key: StockLineSortField::Name,
    //                 desc: None,
    //             }),
    //         )
    //         .unwrap();

    //     let mut stock_lines = mock_data["base"].stock_lines.clone();
    //     stock_lines.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    //     let result_names: Vec<String> = result
    //         .rows
    //         .into_iter()
    //         .map(|stock_line| stock_line.stock_line_row.name)
    //         .collect();
    //     let sorted_names: Vec<String> = stock_lines
    //         .into_iter()
    //         .map(|stock_line| stock_line.name)
    //         .collect();

    //     assert_eq!(result_names, sorted_names);

    //     // Test Name sort with desc sort
    //     let result = service
    //         .get_stock_lines(
    //             &context,
    //             None,
    //             None,
    //             Some(Sort {
    //                 key: StockLineSortField::Name,
    //                 desc: Some(true),
    //             }),
    //         )
    //         .unwrap();

    //     let mut stock_lines = mock_data["base"].stock_lines.clone();
    //     stock_lines.sort_by(|a, b| b.name.to_lowercase().cmp(&a.name.to_lowercase()));

    //     let result_names: Vec<String> = result
    //         .rows
    //         .into_iter()
    //         .map(|stock_line| stock_line.stock_line_row.name)
    //         .collect();
    //     let sorted_names: Vec<String> = stock_lines
    //         .into_iter()
    //         .map(|stock_line| stock_line.name)
    //         .collect();

    //     assert_eq!(result_names, sorted_names);
    // }
}
