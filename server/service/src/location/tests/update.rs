#[cfg(test)]
mod query {
    use repository::mock::mock_store_a;
    use repository::EqualFilter;
    use repository::{
        location::{LocationFilter, LocationRepository},
        mock::MockDataInserts,
        test_db::setup_all,
    };

    use crate::{
        location::update::{UpdateLocation, UpdateLocationError},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn location_service_update_errors() {
        let (_, _, connection_manager, _) =
            setup_all("location_service_update_errors", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let location_repository = LocationRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.location_service;

        let locations_in_store = location_repository
            .query_by_filter(LocationFilter::new().store_id(EqualFilter::equal_to("store_a")))
            .unwrap();

        let locations_not_in_store = location_repository
            .query_by_filter(LocationFilter::new().store_id(EqualFilter::not_equal_to("store_a")))
            .unwrap();

        // Location does not exist
        assert_eq!(
            service.update_location(
                &context,
                UpdateLocation {
                    id: "invalid".to_string(),
                    code: None,
                    name: None,
                    on_hold: None
                },
            ),
            Err(UpdateLocationError::LocationDoesNotExist)
        );

        // Location for another store
        assert_eq!(
            service.update_location(
                &context,
                UpdateLocation {
                    id: locations_not_in_store[0].location_row.id.clone(),
                    code: None,
                    name: None,
                    on_hold: None
                },
            ),
            Err(UpdateLocationError::LocationDoesNotBelongToCurrentStore)
        );

        // Code used in another store
        assert_eq!(
            service.update_location(
                &context,
                UpdateLocation {
                    id: locations_in_store[0].location_row.id.clone(),
                    code: Some(locations_in_store[1].location_row.code.clone()),
                    name: None,
                    on_hold: None
                },
            ),
            Err(UpdateLocationError::CodeAlreadyExists)
        );
    }
    #[actix_rt::test]
    async fn location_service_update_success() {
        let (_, _, connection_manager, _) =
            setup_all("location_service_update_success", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let location_repository = LocationRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.location_service;

        let locations_in_store = location_repository
            .query_by_filter(LocationFilter::new().store_id(EqualFilter::equal_to("store_a")))
            .unwrap();

        // Success with no changes
        let location = locations_in_store[0].clone();
        assert_eq!(
            service.update_location(
                &context,
                UpdateLocation {
                    id: location.location_row.id.clone(),
                    code: None,
                    name: None,
                    on_hold: None
                },
            ),
            Ok(location.clone())
        );

        assert_eq!(
            location_repository
                .query_by_filter(
                    LocationFilter::new().id(EqualFilter::equal_to(&location.location_row.id))
                )
                .unwrap()[0],
            location
        );

        // Success with all changes and code that is not unique accross stores
        let mut location = locations_in_store[1].clone();
        location.location_row.code = "new_location_code".to_string();
        location.location_row.name = "new_location_name".to_string();
        location.location_row.on_hold = !location.location_row.on_hold;

        assert_eq!(
            service.update_location(
                &context,
                UpdateLocation {
                    id: location.location_row.id.clone(),
                    code: Some(location.location_row.code.clone()),
                    name: Some(location.location_row.name.clone()),
                    on_hold: Some(location.location_row.on_hold),
                },
            ),
            Ok(location.clone())
        );

        assert_eq!(
            location_repository
                .query_by_filter(
                    LocationFilter::new().id(EqualFilter::equal_to(&location.location_row.id))
                )
                .unwrap()[0],
            location
        );
    }
}
