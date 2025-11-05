#[cfg(test)]
mod query {
    use repository::mock::mock_store_a;
    use repository::EqualFilter;
    use repository::{
        location::{Location, LocationFilter, LocationRepository},
        mock::MockDataInserts,
        test_db::setup_all,
        LocationRow,
    };

    use crate::{
        location::insert::{InsertLocation, InsertLocationError},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn insert_location_service_errors() {
        let (mock_data, _, connection_manager, _) =
            setup_all("insert_location_service_errors", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let location_repository = LocationRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.location_service;

        let locations_in_store = location_repository
            .query_by_filter(LocationFilter::new().store_id(EqualFilter::equal_to("store_a".to_string())))
            .unwrap();

        assert_eq!(
            service.insert_location(
                &context,
                InsertLocation {
                    id: mock_data["base"].locations[0].id.clone(),
                    code: "invalid".to_string(),
                    name: None,
                    on_hold: None,
                    location_type_id: None,
                    volume: None
                },
            ),
            Err(InsertLocationError::LocationAlreadyExists)
        );

        assert_eq!(
            service.insert_location(
                &context,
                InsertLocation {
                    id: "new_id".to_string(),
                    code: locations_in_store[0].location_row.code.clone(),
                    name: None,
                    on_hold: None,
                    location_type_id: None,
                    volume: None
                },
            ),
            Err(InsertLocationError::LocationWithCodeAlreadyExists)
        );
    }

    #[actix_rt::test]
    async fn insert_location_service_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_location_service_success", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let location_repository = LocationRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.location_service;

        let result_location = Location {
            location_row: LocationRow {
                id: "new_id".to_string(),
                code: "new_code".to_string(),
                name: "new_code".to_string(),
                on_hold: false,
                store_id: "store_a".to_string(),
                location_type_id: None,
                volume: 0.0,
            },
        };

        assert_eq!(
            service.insert_location(
                &context,
                InsertLocation {
                    id: "new_id".to_string(),
                    code: "new_code".to_string(),
                    name: None,
                    on_hold: None,
                    location_type_id: None,
                    volume: None
                },
            ),
            Ok(result_location.clone())
        );

        assert_eq!(
            location_repository
                .query_by_filter(
                    LocationFilter::new()
                        .id(EqualFilter::equal_to("new_id".to_string()))
                        .store_id(EqualFilter::equal_to("store_a".to_string()))
                )
                .unwrap(),
            vec![result_location]
        );

        // Insert location with code that appears in location in another store
        assert_eq!(
            service.insert_location(
                &context,
                InsertLocation {
                    id: "new_id2".to_string(),
                    code: "store_b_location_code".to_string(),
                    name: Some("new_location_name".to_string()),
                    on_hold: Some(true),
                    location_type_id: None,
                    volume: Some(2.0)
                },
            ),
            Ok(Location {
                location_row: LocationRow {
                    id: "new_id2".to_string(),
                    name: "new_location_name".to_string(),
                    code: "store_b_location_code".to_string(),
                    on_hold: true,
                    store_id: "store_a".to_string(),
                    location_type_id: None,
                    volume: 2.0,
                }
            })
        );
    }
}
