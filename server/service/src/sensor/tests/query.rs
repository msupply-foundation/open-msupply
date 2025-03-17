#[cfg(test)]
mod query {
    use repository::{mock::MockDataInserts, test_db::setup_all, SensorFilter, SensorSortField};
    use repository::{EqualFilter, PaginationOption, Sort};

    use crate::{service_provider::ServiceProvider, ListError, SingleRecordError};

    #[actix_rt::test]
    async fn sensor_service_pagination() {
        let (_, _, connection_manager, _) =
            setup_all("test_sensor_service_pagination", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.sensor_service;

        assert_eq!(
            service.get_sensors(
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
            service.get_sensors(
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
    async fn sensor_service_single_record() {
        let (_, _, connection_manager, _) =
            setup_all("test_sensor_single_record", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.sensor_service;

        assert_eq!(
            service.get_sensor(&context, "invalid_id".to_owned()),
            Err(SingleRecordError::NotFound("invalid_id".to_owned()))
        );

        let result = service
            .get_sensor(&context, "sensor_is_active".to_owned())
            .unwrap();

        assert_eq!(result.sensor_row.id, "sensor_is_active");
        assert_eq!(result.sensor_row.is_active, true);
    }

    #[actix_rt::test]
    async fn sensor_service_filter() {
        let (_, _, connection_manager, _) =
            setup_all("test_sensor_filter", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.sensor_service;

        let result = service
            .get_sensors(
                &context,
                None,
                Some(SensorFilter::new().id(EqualFilter::equal_to("sensor_1"))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(result.rows[0].sensor_row.id, "sensor_1");

        let result = service
            .get_sensors(
                &context,
                None,
                Some(SensorFilter::new().id(EqualFilter::equal_any(vec![
                    "sensor_1".to_owned(),
                    "sensor_is_active".to_owned(),
                ]))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 2);
        assert_eq!(result.rows[0].sensor_row.id, "sensor_1");
        assert_eq!(result.rows[1].sensor_row.id, "sensor_is_active");
    }

    #[actix_rt::test]
    async fn sensor_service_sort() {
        let (mock_data, _, connection_manager, _) =
            setup_all("test_sensor_sort", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.sensor_service;
        // Test Name sort with default sort order
        let result = service
            .get_sensors(
                &context,
                None,
                None,
                Some(Sort {
                    key: SensorSortField::Name,
                    desc: None,
                }),
            )
            .unwrap();

        let mut sensors = mock_data["base"].sensors.clone();
        sensors.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        let result_names: Vec<String> = result
            .rows
            .into_iter()
            .map(|sensor| sensor.sensor_row.name)
            .collect();
        let sorted_names: Vec<String> = sensors.into_iter().map(|sensor| sensor.name).collect();

        assert_eq!(result_names, sorted_names);

        // Test Name sort with desc sort
        let result = service
            .get_sensors(
                &context,
                None,
                None,
                Some(Sort {
                    key: SensorSortField::Name,
                    desc: Some(true),
                }),
            )
            .unwrap();

        let mut sensors = mock_data["base"].sensors.clone();
        sensors.sort_by(|a, b| b.name.to_lowercase().cmp(&a.name.to_lowercase()));

        let result_names: Vec<String> = result
            .rows
            .into_iter()
            .map(|sensor| sensor.sensor_row.name)
            .collect();
        let sorted_names: Vec<String> = sensors.into_iter().map(|sensor| sensor.name).collect();

        assert_eq!(result_names, sorted_names);
    }
}
