#[cfg(test)]
mod query {
    use repository::mock::{mock_sensor_1, mock_stock_line_a, mock_store_a};
    use repository::EqualFilter;
    use repository::{
        location::{LocationFilter, LocationRepository},
        mock::MockDataInserts,
        test_db::setup_all,
        InvoiceLineFilter, InvoiceLineRepository, LocationMovementRow,
        LocationMovementRowRepository, SensorFilter, SensorRepository, SensorRowRepository,
        StockLineFilter, StockLineRepository,
    };

    use crate::{
        location::delete::{DeleteLocation, DeleteLocationError, LocationInUse},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn location_service_delete_errors() {
        let (_, _, connection_manager, _) =
            setup_all("location_service_delete_errors", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let location_repository = LocationRepository::new(&connection);
        let stock_line_repository = StockLineRepository::new(&connection);
        let invoice_line_repository = InvoiceLineRepository::new(&connection);

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.location_service;

        let locations_not_in_store = location_repository
            .query_by_filter(
                LocationFilter::new().store_id(EqualFilter::not_equal_to("store_a".to_string())),
            )
            .unwrap();

        // Location does not exist
        assert_eq!(
            service.delete_location(
                &context,
                DeleteLocation {
                    id: "invalid".to_string(),
                },
            ),
            Err(DeleteLocationError::LocationDoesNotExist)
        );

        // Location for another store
        assert_eq!(
            service.delete_location(
                &context,
                DeleteLocation {
                    id: locations_not_in_store[0].location_row.id.clone(),
                },
            ),
            Err(DeleteLocationError::LocationDoesNotBelongToCurrentStore)
        );

        // Location is not empty (invoice lines in use)
        let location_id = "location_1".to_string();
        let stock_lines = stock_line_repository
            .query_by_filter(
                StockLineFilter::new().location_id(EqualFilter::equal_to(location_id.to_string())),
                None,
            )
            .unwrap();
        let invoice_lines = invoice_line_repository
            .query_by_filter(
                InvoiceLineFilter::new()
                    .location_id(EqualFilter::equal_to(location_id.to_string())),
            )
            .unwrap();

        assert_eq!(
            service.delete_location(&context, DeleteLocation { id: location_id }),
            Err(DeleteLocationError::LocationInUse(LocationInUse {
                stock_lines,
                invoice_lines,
                sensors: vec![]
            }))
        );

        // Location is not empty (stock_lines in use)
        let location_id = "location_on_hold".to_string();
        let stock_lines = stock_line_repository
            .query_by_filter(
                StockLineFilter::new().location_id(EqualFilter::equal_to(location_id.to_string())),
                None,
            )
            .unwrap();
        let invoice_lines = invoice_line_repository
            .query_by_filter(
                InvoiceLineFilter::new()
                    .location_id(EqualFilter::equal_to(location_id.to_string())),
            )
            .unwrap();

        assert_eq!(
            service.delete_location(&context, DeleteLocation { id: location_id }),
            Err(DeleteLocationError::LocationInUse(LocationInUse {
                stock_lines,
                invoice_lines,
                sensors: vec![]
            }))
        );

        // Location is not empty (a cold-chain sensor is assigned to it). Before
        // this was checked, the delete reached the foreign key and came back as
        // an internal error naming a constraint, which is nothing a user can
        // act on.
        let location_id = "location_3".to_string();
        let mut sensor = mock_sensor_1();
        sensor.location_id = Some(location_id.clone());
        SensorRowRepository::new(&connection)
            .upsert_one(&sensor)
            .unwrap();

        let sensors = SensorRepository::new(&connection)
            .query_by_filter(
                SensorFilter::new()
                    .location(LocationFilter::new().id(EqualFilter::equal_to(location_id.clone()))),
            )
            .unwrap();
        assert_eq!(sensors.len(), 1);

        assert_eq!(
            service.delete_location(&context, DeleteLocation { id: location_id }),
            Err(DeleteLocationError::LocationInUse(LocationInUse {
                stock_lines: vec![],
                invoice_lines: vec![],
                sensors
            }))
        );
    }
    /// A reference `check_location_in_use` does not enumerate still stops the
    /// delete, and must be reported as the location being in use rather than as
    /// a database fault. `location_movement` is the case the locations spec
    /// calls out by name (OMS-REG-INV-01.35): stock that has ever entered or
    /// left a location pins it even once the location is empty.
    #[actix_rt::test]
    async fn location_service_delete_unenumerated_reference_is_in_use() {
        let (_, _, connection_manager, _) = setup_all(
            "location_service_delete_unenumerated_reference_is_in_use",
            MockDataInserts::all(),
        )
        .await;

        let connection = connection_manager.connection().unwrap();
        let location_repository = LocationRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.location_service;

        // `location_2` is the one the success test deletes, so nothing
        // `check_location_in_use` looks at references it. A movement does.
        let location_id = "location_2".to_string();
        LocationMovementRowRepository::new(&connection)
            .upsert_one(&LocationMovementRow {
                id: "location_2_movement".to_string(),
                store_id: mock_store_a().id,
                stock_line_id: mock_stock_line_a().id,
                location_id: Some(location_id.clone()),
                enter_datetime: None,
                exit_datetime: None,
            })
            .unwrap();

        // Nothing to list — the check does not know about movements — but the
        // refusal is still the typed one, not DatabaseError.
        assert_eq!(
            service.delete_location(
                &context,
                DeleteLocation {
                    id: location_id.clone()
                }
            ),
            Err(DeleteLocationError::LocationInUse(LocationInUse::default()))
        );

        // And the location survives the refused delete.
        assert_eq!(
            location_repository
                .query_by_filter(LocationFilter::new().id(EqualFilter::equal_to(location_id)))
                .unwrap()
                .len(),
            1
        );
    }

    #[actix_rt::test]
    async fn location_service_delete_success() {
        let (_, _, connection_manager, _) =
            setup_all("location_service_delete_success", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let location_repository = LocationRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.location_service;

        assert_eq!(
            service.delete_location(
                &context,
                DeleteLocation {
                    id: "location_2".to_string()
                },
            ),
            Ok("location_2".to_string())
        );

        assert_eq!(
            location_repository
                .query_by_filter(
                    LocationFilter::new().id(EqualFilter::equal_to("location_2".to_string()))
                )
                .unwrap(),
            vec![]
        );
    }
}
