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
    async fn cold_chain_service_pagination() {
        let (_, connection, connection_manager, _) =
            setup_all("test_cold_chain_service_pagination", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let service = service_provider.cold_chain_service;

        assert_eq!(
            service.temperature_breaches(
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
            service.temperature_breaches(
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
    async fn cold_chain_service_single_record() {
        let (_, _, connection_manager, _) = setup_all(
            "test_temperature_breach_single_record",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.cold_chain_service;

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
        assert_eq!(result.temperature_breach_row.unacknowledged, false);
    }

    #[actix_rt::test]
    async fn cold_chain_service_filter() {
        let (_, connection, connection_manager, _) =
            setup_all("test_temperature_breach_filter", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let service = service_provider.cold_chain_service;

        let result = service
            .temperature_breaches(
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
            .temperature_breaches(
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
            "temperature_breach_acknowledged"
        );
        assert_eq!(
            result.rows[1].temperature_breach_row.id,
            "temperature_breach_1"
        );
    }

    #[actix_rt::test]
    async fn cold_chain_service_sort() {
        let (mock_data, connection, connection_manager, _) =
            setup_all("test_temperature_breach_sort", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let service = service_provider.cold_chain_service;
        // Test StartDatetime sort with default sort order
        let result = service
            .temperature_breaches(
                &connection,
                None,
                None,
                Some(Sort {
                    key: TemperatureBreachSortField::StartDatetime,
                    desc: None,
                }),
            )
            .unwrap();

        let mut temperature_breaches = mock_data["base"].temperature_breaches.clone();
        temperature_breaches.sort_by(|a, b| a.start_datetime.cmp(&b.start_datetime));

        let result_timestamps: Vec<NaiveDateTime> = result
            .rows
            .into_iter()
            .map(|temperature_breach| temperature_breach.temperature_breach_row.start_datetime)
            .collect();
        let sorted_timestamps: Vec<NaiveDateTime> = temperature_breaches
            .into_iter()
            .map(|temperature_breach| temperature_breach.start_datetime)
            .collect();

        assert_eq!(result_timestamps, sorted_timestamps);

        // Test EndDatetime sort with desc sort
        let result = service
            .temperature_breaches(
                &connection,
                None,
                None,
                Some(Sort {
                    key: TemperatureBreachSortField::EndDatetime,
                    desc: Some(true),
                }),
            )
            .unwrap();

        let mut temperature_breaches = mock_data["base"].temperature_breaches.clone();
        temperature_breaches.sort_by(|a, b| b.end_datetime.cmp(&a.end_datetime));

        let result_timestamps: Vec<NaiveDateTime> = result
            .rows
            .into_iter()
            .map(|temperature_breach| {
                temperature_breach
                    .temperature_breach_row
                    .end_datetime
                    .unwrap()
            })
            .collect();

        let sorted_timestamps: Vec<NaiveDateTime> = temperature_breaches
            .into_iter()
            .map(|temperature_breach| temperature_breach.end_datetime.unwrap())
            .collect();

        assert_eq!(result_timestamps, sorted_timestamps);
    }
}
