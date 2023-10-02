#[cfg(test)]
mod query {
    use repository::mock::mock_store_a;
    use repository::{
        mock::MockDataInserts,
        temperature_log::{TemperatureLog, TemperatureLogFilter, TemperatureLogRepository},
        test_db::setup_all,
        TemperatureLogRow,
    };
    use repository::{EqualFilter, SensorRow};

    use crate::{
        service_provider::ServiceProvider,
        temperature_log::insert::{InsertTemperatureLog, InsertTemperatureLogError},
    };

    use chrono::{Duration, NaiveDate};

    #[actix_rt::test]
    async fn insert_temperature_log_service_errors() {
        let (mock_data, _, connection_manager, _) = setup_all(
            "insert_temperature_log_service_errors",
            MockDataInserts::all(),
        )
        .await;

        let connection = connection_manager.connection().unwrap();
        let temperature_log_repository = TemperatureLogRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.temperature_log_service;

        let temperature_logs_in_store = temperature_log_repository
            .query_by_filter(TemperatureLogFilter::new().store_id(EqualFilter::equal_to("store_a")))
            .unwrap();

        assert_eq!(
            service.insert_temperature_log(
                &context,
                InsertTemperatureLog {
                    id: mock_data["base"].temperature_logs[0].id.clone(),
                    sensor_id: "invalid".to_owned(),
                    timestamp: NaiveDate::from_ymd_opt(2022, 7, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                        + Duration::seconds(47046),
                    temperature: 2.4,
                },
            ),
            Err(InsertTemperatureLogError::TemperatureLogAlreadyExists)
        );

        assert_eq!(
            service.insert_temperature_log(
                &context,
                InsertTemperatureLog {
                    id: "new_id".to_owned(),
                    sensor_id: temperature_logs_in_store[0]
                        .temperature_log_row
                        .sensor_id
                        .clone(),
                    timestamp: temperature_logs_in_store[0]
                        .temperature_log_row
                        .timestamp
                        .clone(),
                    temperature: temperature_logs_in_store[0].temperature_log_row.temperature,
                },
            ),
            Err(InsertTemperatureLogError::TemperatureLogNotUnique)
        );
    }

    #[actix_rt::test]
    async fn insert_temperature_log_service_success() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_temperature_log_service_success",
            MockDataInserts::all(),
        )
        .await;

        let connection = connection_manager.connection().unwrap();
        let temperature_log_repository = TemperatureLogRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.temperature_log_service;

        let result_temperature_log = TemperatureLog {
            temperature_log_row: TemperatureLogRow {
                id: "new_id".to_owned(),
                sensor_id: "sensor_1".to_owned(),
                temperature: 2.4,
                store_id: Some("store_a".to_owned()),
                location_id: None,
                timestamp: NaiveDate::from_ymd_opt(2022, 7, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
                    + Duration::seconds(47046),
                temperature_breach_id: None,
            },
            sensor_row: SensorRow {
                id: "sensor_1".to_string(),
                name: "name_sensor_1".to_string(),
                serial: "serial_sensor_1".to_string(),
                store_id: Some("store_a".to_string()),
                is_active: false,
                battery_level: Some(100),
                log_interval: Some(1),
                last_connection_timestamp: Some(
                    NaiveDate::from_ymd_opt(2023, 7, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                        + Duration::seconds(47046),
                ),
                location_id: None,
            },
            location_row: None,
            temperature_breach_row: None,
        };

        assert_eq!(
            service.insert_temperature_log(
                &context,
                InsertTemperatureLog {
                    id: "new_id".to_owned(),
                    sensor_id: "sensor_1".to_owned(),
                    timestamp: NaiveDate::from_ymd_opt(2022, 7, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                        + Duration::seconds(47046),
                    temperature: 2.4,
                },
            ),
            Ok(result_temperature_log.clone())
        );

        assert_eq!(
            temperature_log_repository
                .query_by_filter(
                    TemperatureLogFilter::new()
                        .id(EqualFilter::equal_to("new_id"))
                        .store_id(EqualFilter::equal_to("store_a",))
                )
                .unwrap(),
            vec![result_temperature_log]
        );
    }
}
