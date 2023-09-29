#[cfg(test)]
mod query {
    use repository::mock::mock_store_a;
    use repository::EqualFilter;
    use repository::{
        mock::MockDataInserts,
        temperature_breach::{TemperatureBreach, TemperatureBreachFilter, TemperatureBreachRepository},
        test_db::setup_all,
        TemperatureBreachRow, TemperatureBreachRowType,
    };

    use crate::{
        temperature_breach::insert::{InsertTemperatureBreach, InsertTemperatureBreachError},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn insert_temperature_breach_service_errors() {
        let (mock_data, _, connection_manager, _) =
            setup_all("insert_temperature_breach_service_errors", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let temperature_breach_repository = TemperatureBreachRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.temperature_breach_service;

        let temperature_breachs_in_store = temperature_breach_repository
            .query_by_filter(TemperatureBreachFilter::new().store_id(EqualFilter::equal_to("store_a")))
            .unwrap();

        assert_eq!(
            service.insert_temperature_breach(
                &context,
                InsertTemperatureBreach {
                    id: mock_data["base"].temperature_breachs[0].id.clone(),
                    sensor_id: "invalid".to_owned(),
                    start_timestamp: NaiveDate::from_ymd_opt(2022, 7, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                        + Duration::seconds(47046),
                    end_timestamp: NaiveDate::from_ymd_opt(2022, 7, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                        + Duration::seconds(50646),
                    duration: 3600,
                    //r#type: TemperatureBreachRowType::ColdConsecutive,
                },
            ),
            Err(InsertTemperatureBreachError::TemperatureBreachAlreadyExists)
        );

        assert_eq!(
            service.insert_temperature_breach(
                &context,
                InsertTemperatureBreach {
                    id: "new_id".to_owned(),
                    sensor_id: temperature_breachs_in_store[0].temperature_breach_row.sensor_id.clone(),
                    start_timestamp: temperature_breachs_in_store[0].temperature_breach_row.start_timestamp.clone(),
                    end_timestamp: temperature_breachs_in_store[0].temperature_breach_row.end_timestamp.clone(),
                    duration: temperature_breachs_in_store[0].temperature_breach_row.duration,
                    //r#type: temperature_breachs_in_store[0].temperature_breach_row.r#type,
                },
            ),
            Err(InsertTemperatureBreachError::TemperatureBreachNotUnique)
        );

    }

    #[actix_rt::test]
    async fn insert_temperature_breach_service_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_temperature_breach_service_success", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let temperature_breach_repository = TemperatureBreachRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.temperature_breach_service;

        let result_temperature_breach = TemperatureBreach {
            temperature_breach_row: TemperatureBreachRow {
                id: "new_id".to_owned(),
                acknowledged: false,
                store_id: Some("store_a".to_owned()),
                location_id: None,
                duration: 3600,
                threshold_minimum: -273.0,
                threshold_maximum: 2.0,
                r#type: TemperatureBreachRowType::ColdConsecutive,
                sensor_id: "sensor_1".to_owned(),
                start_timestamp: NaiveDate::from_ymd_opt(2022, 7, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
                    + Duration::seconds(47046),
                end_timestamp: NaiveDate::from_ymd_opt(2022, 7, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
                    + Duration::seconds(50646),
                threshold_duration: 3600,
            },
        };

        assert_eq!(
            service.insert_temperature_breach(
                &context,
                InsertTemperatureBreach {
                    id: "new_id".to_owned(),
                    sensor_id: "sensor_1".to_owned(),
                    start_timestamp: NaiveDate::from_ymd_opt(2022, 7, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                        + Duration::seconds(47046),
                    end_timestamp: NaiveDate::from_ymd_opt(2022, 7, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                        + Duration::seconds(50646),
                    duration: 3600,
                    //r#type: TemperatureBreachRowType::ColdConsecutive
                },
            ),
            Ok(result_temperature_breach.clone())
        );

        assert_eq!(
            temperature_breach_repository
                .query_by_filter(
                    TemperatureBreachFilter::new()
                        .id(EqualFilter::equal_to("new_id"))
                        .store_id(EqualFilter::equal_to("store_a",))
                )
                .unwrap(),
            vec![result_temperature_breach]
        );

    }
}
