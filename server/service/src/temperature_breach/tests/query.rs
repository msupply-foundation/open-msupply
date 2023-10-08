#[cfg(test)]
mod query {
    use chrono::NaiveDateTime;
    use repository::{
        mock::MockDataInserts,
        temperature_breach::{TemperatureBreachFilter, TemperatureBreachSortField},
        test_db::setup_all,
    };
    use repository::{EqualFilter, PaginationOption, Sort};

    use crate::{service_provider::ServiceProvider, ListError, SingleRecordError};

    #[actix_rt::test]
    async fn temperature_breach_service_pagination() {
        let (_, connection, connection_manager, _) = setup_all(
            "test_temperature_breach_service_pagination",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let service = service_provider.temperature_breach_service;

        assert_eq!(
            service.get_temperature_breaches(
                &connection,
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
            service.get_temperature_breaches(
                &connection,
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
    async fn temperature_breach_service_single_record() {
        let (_, _, connection_manager, _) = setup_all(
            "test_temperature_breach_single_record",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.temperature_breach_service;

        assert_eq!(
            service.get_temperature_breach(&context, "invalid_id".to_owned()),
            Err(SingleRecordError::NotFound("invalid_id".to_owned()))
        );

        let result = service
            .get_temperature_breach(&context, "temperature_breach_acknowledged".to_owned())
            .unwrap();

        assert_eq!(
            result.temperature_breach_row.id,
            "temperature_breach_acknowledged"
        );
        assert_eq!(result.temperature_breach_row.acknowledged, true);
    }

    #[actix_rt::test]
    async fn temperature_breach_service_filter() {
        let (_, connection, connection_manager, _) =
            setup_all("test_temperature_breach_filter", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let service = service_provider.temperature_breach_service;

        let result = service
            .get_temperature_breaches(
                &connection,
                None,
                Some(
                    TemperatureBreachFilter::new()
                        .id(EqualFilter::equal_to("temperature_breach_1")),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(
            result.rows[0].temperature_breach_row.id,
            "temperature_breach_1"
        );

        let result = service
            .get_temperature_breaches(
                &connection,
                None,
                Some(
                    TemperatureBreachFilter::new().id(EqualFilter::equal_any(vec![
                        "temperature_breach_1".to_owned(),
                        "temperature_breach_acknowledged".to_owned(),
                    ])),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 2);
        assert_eq!(
            result.rows[0].temperature_breach_row.id,
            "temperature_breach_1"
        );
        assert_eq!(
            result.rows[1].temperature_breach_row.id,
            "temperature_breach_acknowledged"
        );
    }

    #[actix_rt::test]
    async fn temperature_breach_service_sort() {
        let (mock_data, connection, connection_manager, _) =
            setup_all("test_temperature_breach_sort", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let service = service_provider.temperature_breach_service;
        // Test StartTimestamp sort with default sort order
        let result = service
            .get_temperature_breaches(
                &connection,
                None,
                None,
                Some(Sort {
                    key: TemperatureBreachSortField::StartTimestamp,
                    desc: None,
                }),
            )
            .unwrap();

        let mut temperature_breaches = mock_data["base"].temperature_breaches.clone();
        temperature_breaches.sort_by(|a, b| a.start_timestamp.cmp(&b.start_timestamp));

        let result_timestamps: Vec<NaiveDateTime> = result
            .rows
            .into_iter()
            .map(|temperature_breach| temperature_breach.temperature_breach_row.start_timestamp)
            .collect();
        let sorted_timestamps: Vec<NaiveDateTime> = temperature_breaches
            .into_iter()
            .map(|temperature_breach| temperature_breach.start_timestamp)
            .collect();

        assert_eq!(result_timestamps, sorted_timestamps);

        // Test EndTimestamp sort with desc sort
        let result = service
            .get_temperature_breaches(
                &connection,
                None,
                None,
                Some(Sort {
                    key: TemperatureBreachSortField::EndTimestamp,
                    desc: Some(true),
                }),
            )
            .unwrap();

        let mut temperature_breaches = mock_data["base"].temperature_breaches.clone();
        temperature_breaches.sort_by(|a, b| b.end_timestamp.cmp(&a.end_timestamp));

        let result_timestamps: Vec<NaiveDateTime> = result
            .rows
            .into_iter()
            .map(|temperature_breach| temperature_breach.temperature_breach_row.end_timestamp)
            .collect();
        let sorted_timestamps: Vec<NaiveDateTime> = temperature_breaches
            .into_iter()
            .map(|temperature_breach| temperature_breach.end_timestamp)
            .collect();

        assert_eq!(result_timestamps, sorted_timestamps);
    }
}
