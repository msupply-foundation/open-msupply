#[cfg(test)]
mod query {
    use chrono::NaiveDateTime;
    use repository::{
        mock::MockDataInserts,
        temperature_log::{TemperatureLogFilter, TemperatureLogSortField},
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
            service.get_temperature_logs(
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
            service.get_temperature_logs(
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
        let (_, _, connection_manager, _) =
            setup_all("test_temperature_log_single_record", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.cold_chain_service;

        assert_eq!(
            service.get_temperature_log(&context, "invalid_id".to_owned()),
            Err(SingleRecordError::NotFound("invalid_id".to_owned()))
        );

        let result = service
            .get_temperature_log(&context, "temperature_log_1a".to_owned())
            .unwrap();

        assert_eq!(result.temperature_log_row.id, "temperature_log_1a");
        assert_eq!(result.temperature_log_row.temperature, 10.6);
    }

    #[actix_rt::test]
    async fn cold_chain_service_filter() {
        let (_, connection, connection_manager, _) =
            setup_all("test_temperature_log_filter", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let service = service_provider.cold_chain_service;

        let result = service
            .get_temperature_logs(
                &connection,
                None,
                Some(TemperatureLogFilter::new().id(EqualFilter::equal_to("temperature_log_1a"))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(result.rows[0].temperature_log_row.id, "temperature_log_1a");

        let result = service
            .get_temperature_logs(
                &connection,
                None,
                Some(TemperatureLogFilter::new().id(EqualFilter::equal_any(vec![
                    "temperature_log_1a".to_owned(),
                    "temperature_log_1b".to_owned(),
                ]))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 2);
        assert_eq!(result.rows[0].temperature_log_row.id, "temperature_log_1b");
        assert_eq!(result.rows[1].temperature_log_row.id, "temperature_log_1a");
    }

    #[actix_rt::test]
    async fn cold_chain_service_sort() {
        let (mock_data, connection, connection_manager, _) =
            setup_all("test_temperature_log_sort", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let service = service_provider.cold_chain_service;
        // Test Datetime sort with default sort order
        let result = service
            .get_temperature_logs(
                &connection,
                None,
                None,
                Some(Sort {
                    key: TemperatureLogSortField::Datetime,
                    desc: None,
                }),
            )
            .unwrap();

        let mut temperature_logs = mock_data["base"].temperature_logs.clone();
        temperature_logs.sort_by(|a, b| a.datetime.cmp(&b.datetime));

        let result_timestamps: Vec<NaiveDateTime> = result
            .rows
            .into_iter()
            .map(|temperature_log| temperature_log.temperature_log_row.datetime)
            .collect();
        let sorted_timestamps: Vec<NaiveDateTime> = temperature_logs
            .into_iter()
            .map(|temperature_log| temperature_log.datetime)
            .collect();

        assert_eq!(result_timestamps, sorted_timestamps);

        // Test Temperature sort with desc sort
        let result = service
            .get_temperature_logs(
                &connection,
                None,
                None,
                Some(Sort {
                    key: TemperatureLogSortField::Temperature,
                    desc: Some(true),
                }),
            )
            .unwrap();

        let mut temperature_logs = mock_data["base"].temperature_logs.clone();
        temperature_logs.sort_by(|a, b| b.temperature.partial_cmp(&a.temperature).unwrap());

        let result_temperatures: Vec<f64> = result
            .rows
            .into_iter()
            .map(|temperature_log| temperature_log.temperature_log_row.temperature)
            .collect();
        let sorted_temperatures: Vec<f64> = temperature_logs
            .into_iter()
            .map(|temperature_log| temperature_log.temperature)
            .collect();

        assert_eq!(result_temperatures, sorted_temperatures);
    }
}
