#[cfg(test)]
mod query {
    use repository::mock::mock_store_a;
    use repository::EqualFilter;
    use repository::{
        sensor::{SensorFilter, SensorRepository},
        mock::MockDataInserts,
        test_db::setup_all,
        //InvoiceLineFilter, InvoiceLineRepository, StockLineFilter, StockLineRepository,
    };

    use crate::{
        sensor::delete::{DeleteSensor, DeleteSensorError, SensorInUse},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn sensor_service_delete_errors() {
        let (_, _, connection_manager, _) =
            setup_all("sensor_service_delete_errors", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let sensor_repository = SensorRepository::new(&connection);
        //let stock_line_repository = StockLineRepository::new(&connection);
        //let invoice_line_repository = InvoiceLineRepository::new(&connection);

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.sensor_service;

        let sensors_not_in_store = sensor_repository
            .query_by_filter(SensorFilter::new().store_id(EqualFilter::not_equal_to("store_a")))
            .unwrap();

        // Sensor does not exist
        assert_eq!(
            service.delete_sensor(
                &context,
                DeleteSensor {
                    id: "invalid".to_owned(),
                },
            ),
            Err(DeleteSensorError::SensorDoesNotExist)
        );

        // Sensor for another store
        assert_eq!(
            service.delete_sensor(
                &context,
                DeleteSensor {
                    id: sensors_not_in_store[0].sensor_row.id.clone(),
                },
            ),
            Err(DeleteSensorError::SensorDoesNotBelongToCurrentStore)
        );

        // Sensor is not empty (invoice lines in use)
        let sensor_id = "sensor_1".to_owned();
        //let stock_lines = stock_line_repository
        //    .query_by_filter(
        //        StockLineFilter::new().sensor_id(EqualFilter::equal_to(&sensor_id)),
        //        None,
        //    )
        //    .unwrap();
        //let invoice_lines = invoice_line_repository
        //    .query_by_filter(
        //        InvoiceLineFilter::new().sensor_id(EqualFilter::equal_to(&sensor_id)),
        //    )
        //    .unwrap();

        assert_eq!(
            service.delete_sensor(&context, DeleteSensor { id: sensor_id }),
            Err(DeleteSensorError::SensorInUse(SensorInUse {
        //        stock_lines,
        //        invoice_lines
            }))
        );
    }
    #[actix_rt::test]
    async fn sensor_service_delete_success() {
        let (_, _, connection_manager, _) =
            setup_all("sensor_service_delete_success", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let sensor_repository = SensorRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.sensor_service;

        assert_eq!(
            service.delete_sensor(
                &context,
                DeleteSensor {
                    id: "sensor_2".to_owned()
                },
            ),
            Ok("sensor_2".to_owned())
        );

        assert_eq!(
            sensor_repository
                .query_by_filter(SensorFilter::new().id(EqualFilter::equal_to("sensor_2")))
                .unwrap(),
            vec![]
        );
    }
}
