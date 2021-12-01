#[cfg(test)]
mod query {
    use domain::location::{LocationFilter, UpdateLocation};
    use repository::{mock::MockDataInserts, test_db::setup_all, LocationRepository};

    use crate::{
        current_store_id, location::update::UpdateLocationError, service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn location_service_update_errors() {
        let (_, _, connection_manager, _) =
            setup_all("location_service_update_errors", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let location_repository = LocationRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.location_service;

        let locations_in_store = location_repository
            .query_by_filter(
                LocationFilter::new()
                    .store_id(|f| f.equal_to(&current_store_id(&connection).unwrap())),
            )
            .unwrap();

        let locations_not_in_store = location_repository
            .query_by_filter(
                LocationFilter::new()
                    .store_id(|f| f.not_equal_to(&current_store_id(&connection).unwrap())),
            )
            .unwrap();

        // Location does not exist
        assert_eq!(
            service.update_location(
                &context,
                UpdateLocation {
                    id: "invalid".to_owned(),
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
                    id: locations_not_in_store[0].id.clone(),
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
                    id: locations_in_store[0].id.clone(),
                    code: Some(locations_in_store[1].code.clone()),
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
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.location_service;

        let locations_in_store = location_repository
            .query_by_filter(
                LocationFilter::new()
                    .store_id(|f| f.equal_to(&current_store_id(&connection).unwrap())),
            )
            .unwrap();

        // Success with no changes
        let location = locations_in_store[0].clone();
        assert_eq!(
            service.update_location(
                &context,
                UpdateLocation {
                    id: location.id.clone(),
                    code: None,
                    name: None,
                    on_hold: None
                },
            ),
            Ok(location.clone())
        );

        assert_eq!(
            location_repository
                .query_by_filter(LocationFilter::new().id(|f| f.equal_to(&location.id)))
                .unwrap()[0],
            location
        );

        // Success with all changes and code that is not unique accross stores
        let mut location = locations_in_store[1].clone();
        location.code = "new_location_code".to_owned();
        location.name = "new_location_name".to_owned();
        location.on_hold = !location.on_hold;

        assert_eq!(
            service.update_location(
                &context,
                UpdateLocation {
                    id: location.id.clone(),
                    code: Some(location.code.clone()),
                    name: Some(location.name.clone()),
                    on_hold: Some(location.on_hold),
                },
            ),
            Ok(location.clone())
        );

        assert_eq!(
            location_repository
                .query_by_filter(LocationFilter::new().id(|f| f.equal_to(&location.id)))
                .unwrap()[0],
            location
        );
    }
}
