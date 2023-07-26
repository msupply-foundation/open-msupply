#[cfg(test)]
mod query {
    use repository::mock::mock_store_a;
    use repository::EqualFilter;
    use repository::{
        sensor::{SensorFilter, SensorRepository},
        mock::MockDataInserts,
        test_db::setup_all,
    };

    use crate::{
        sensor::update::{UpdateSensor, UpdateSensorError},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn sensor_service_update_errors() {
        let (_, _, connection_manager, _) =
            setup_all("sensor_service_update_errors", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let sensor_repository = SensorRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.sensor_service;

        let sensors_in_store = sensor_repository
            .query_by_filter(SensorFilter::new().store_id(EqualFilter::equal_to("store_a")))
            .unwrap();

        let sensors_not_in_store = sensor_repository
            .query_by_filter(SensorFilter::new().store_id(EqualFilter::not_equal_to("store_a")))
            .unwrap();

        // Sensor does not exist
        assert_eq!(
            service.update_sensor(
                &context,
                UpdateSensor {
                    id: "invalid".to_owned(),
                    serial: None,
                    name: None,
                    is_active: None
                },
            ),
            Err(UpdateSensorError::SensorDoesNotExist)
        );

        // Sensor for another store
        assert_eq!(
            service.update_sensor(
                &context,
                UpdateSensor {
                    id: sensors_not_in_store[0].sensor_row.id.clone(),
                    serial: None,
                    name: None,
                    is_active: None
                },
            ),
            Err(UpdateSensorError::SensorDoesNotBelongToCurrentStore)
        );

        // Code used in another store
        assert_eq!(
            service.update_sensor(
                &context,
                UpdateSensor {
                    id: sensors_in_store[0].sensor_row.id.clone(),
                    serial: Some(sensors_in_store[1].sensor_row.serial.clone()),
                    name: None,
                    is_active: None
                },
            ),
            Err(UpdateSensorError::CodeAlreadyExists)
        );
    }
    #[actix_rt::test]
    async fn sensor_service_update_success() {
        let (_, _, connection_manager, _) =
            setup_all("sensor_service_update_success", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let sensor_repository = SensorRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.sensor_service;

        let sensors_in_store = sensor_repository
            .query_by_filter(SensorFilter::new().store_id(EqualFilter::equal_to("store_a")))
            .unwrap();

        // Success with no changes
        let sensor = sensors_in_store[0].clone();
        assert_eq!(
            service.update_sensor(
                &context,
                UpdateSensor {
                    id: sensor.sensor_row.id.clone(),
                    serial: None,
                    name: None,
                    is_active: None
                },
            ),
            Ok(sensor.clone())
        );

        assert_eq!(
            sensor_repository
                .query_by_filter(
                    SensorFilter::new().id(EqualFilter::equal_to(&sensor.sensor_row.id))
                )
                .unwrap()[0],
                sensor
        );

        // Success with all changes and serial that is not unique accross stores
        let mut sensor = sensors_in_store[1].clone();
        sensor.sensor_row.serial = "new_sensor_serial".to_owned();
        sensor.sensor_row.name = "new_sensor_name".to_owned();
        sensor.sensor_row.is_active = !sensor.sensor_row.is_active;

        assert_eq!(
            service.update_sensor(
                &context,
                UpdateSensor {
                    id: sensor.sensor_row.id.clone(),
                    serial: Some(sensor.sensor_row.serial.clone()),
                    name: Some(sensor.sensor_row.name.clone()),
                    is_active: Some(sensor.sensor_row.is_active),
                },
            ),
            Ok(sensor.clone())
        );

        assert_eq!(
            sensor_repository
                .query_by_filter(
                    SensorFilter::new().id(EqualFilter::equal_to(&sensor.sensor_row.id))
                )
                .unwrap()[0],
                sensor
        );
    }
}
