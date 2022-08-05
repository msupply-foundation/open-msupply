#[cfg(test)]
mod query {
    use repository::EqualFilter;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, Location, LocationFilter, LocationRepository,
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
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context("", "").unwrap();
        let service = service_provider.location_service;

        let locations_in_store = location_repository
            .query_by_filter(LocationFilter::new().store_id(EqualFilter::equal_to("store_a")))
            .unwrap();

        assert_eq!(
            service.insert_location(
                &context,
                "store_a",
                InsertLocation {
                    id: mock_data["base"].locations[0].id.clone(),
                    code: "invalid".to_owned(),
                    name: None,
                    on_hold: None
                },
            ),
            Err(InsertLocationError::LocationAlreadyExists)
        );

        assert_eq!(
            service.insert_location(
                &context,
                "store_a",
                InsertLocation {
                    id: "new_id".to_owned(),
                    code: locations_in_store[0].location_row.code.clone(),
                    name: None,
                    on_hold: None
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
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context("", "").unwrap();
        let service = service_provider.location_service;

        let result_location = Location {
            location_row: LocationRow {
                id: "new_id".to_owned(),
                code: "new_code".to_owned(),
                name: "new_code".to_owned(),
                on_hold: false,
                store_id: "store_a".to_owned(),
            },
        };

        assert_eq!(
            service.insert_location(
                &context,
                "store_a",
                InsertLocation {
                    id: "new_id".to_owned(),
                    code: "new_code".to_owned(),
                    name: None,
                    on_hold: None
                },
            ),
            Ok(result_location.clone())
        );

        assert_eq!(
            location_repository
                .query_by_filter(
                    LocationFilter::new()
                        .id(EqualFilter::equal_to("new_id"))
                        .store_id(EqualFilter::equal_to("store_a",))
                )
                .unwrap(),
            vec![result_location]
        );

        // Insert location with code that appears in location in another store
        assert_eq!(
            service.insert_location(
                &context,
                "store_a",
                InsertLocation {
                    id: "new_id2".to_owned(),
                    code: "store_b_location_code".to_owned(),
                    name: Some("new_location_name".to_owned()),
                    on_hold: Some(true),
                },
            ),
            Ok(Location {
                location_row: LocationRow {
                    id: "new_id2".to_owned(),
                    name: "new_location_name".to_owned(),
                    code: "store_b_location_code".to_owned(),
                    on_hold: true,
                    store_id: "store_a".to_owned(),
                }
            })
        );
    }
}
