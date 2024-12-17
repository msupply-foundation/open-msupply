#[cfg(test)]
mod query {
    use repository::mock::mock_store_a;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, Sensor, SensorFilter, SensorRepository,
        SensorRow,
    };
    use repository::{EqualFilter, SensorType};

    use crate::{
        sensor::insert::{InsertSensor, InsertSensorError},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn insert_sensor_service_errors() {
        let (mock_data, _, connection_manager, _) =
            setup_all("insert_sensor_service_errors", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let sensor_repository = SensorRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.sensor_service;

        let sensors_in_store = sensor_repository
            .query_by_filter(SensorFilter::new().store_id(EqualFilter::equal_to("store_a")))
            .unwrap();

        assert_eq!(
            service.insert_sensor(
                &context,
                InsertSensor {
                    id: mock_data["base"].sensors[0].id.clone(),
                    serial: "invalid".to_owned(),
                    name: None,
                    is_active: None,
                    r#type: SensorType::BlueMaestro,
                    log_interval: None,
                    battery_level: None,
                },
            ),
            Err(InsertSensorError::SensorAlreadyExists)
        );

        assert_eq!(
            service.insert_sensor(
                &context,
                InsertSensor {
                    id: "new_id".to_owned(),
                    serial: sensors_in_store[0].sensor_row.serial.clone(),
                    name: None,
                    is_active: None,
                    r#type: SensorType::BlueMaestro,
                    log_interval: None,
                    battery_level: None,
                },
            ),
            Err(InsertSensorError::SensorWithSerialAlreadyExists)
        );
    }

    #[actix_rt::test]
    async fn insert_sensor_service_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_sensor_service_success", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let sensor_repository = SensorRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.sensor_service;

        let result_sensor = Sensor {
            sensor_row: SensorRow {
                id: "new_id".to_owned(),
                serial: "new_serial".to_owned(),
                name: "new_name".to_owned(),
                is_active: false,
                store_id: "store_a".to_owned(),
                location_id: None,
                battery_level: Some(99),
                log_interval: Some(10),
                last_connection_datetime: None,
                r#type: SensorType::BlueMaestro,
            },
        };

        assert_eq!(
            service.insert_sensor(
                &context,
                InsertSensor {
                    id: "new_id".to_owned(),
                    serial: "new_serial".to_owned(),
                    name: Some("new_name".to_owned()),
                    is_active: None,
                    r#type: SensorType::BlueMaestro,
                    log_interval: Some(10),
                    battery_level: Some(99),
                },
            ),
            Ok(result_sensor.clone())
        );

        assert_eq!(
            sensor_repository
                .query_by_filter(
                    SensorFilter::new()
                        .id(EqualFilter::equal_to("new_id"))
                        .store_id(EqualFilter::equal_to("store_a",))
                )
                .unwrap(),
            vec![result_sensor]
        );

        // Insert sensor with serial that appears in sensor in another store
        assert_eq!(
            service.insert_sensor(
                &context,
                InsertSensor {
                    id: "new_id2".to_owned(),
                    serial: "store_b_sensor_serial".to_owned(),
                    name: Some("new_sensor_name".to_owned()),
                    is_active: Some(true),
                    r#type: SensorType::BlueMaestro,
                    log_interval: None,
                    battery_level: None,
                },
            ),
            Ok(Sensor {
                sensor_row: SensorRow {
                    id: "new_id2".to_owned(),
                    name: "new_sensor_name".to_owned(),
                    serial: "store_b_sensor_serial".to_owned(),
                    is_active: true,
                    store_id: "store_a".to_owned(),
                    location_id: None,
                    battery_level: None,
                    log_interval: None,
                    last_connection_datetime: None,
                    r#type: SensorType::BlueMaestro,
                }
            })
        );
    }
}
