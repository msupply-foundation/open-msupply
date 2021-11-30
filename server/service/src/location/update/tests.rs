#[cfg(test)]
mod query {
    use domain::location::{LocationFilter, UpdateLocation};
    use repository::{mock::MockDataInserts, test_db::setup_all, LocationRepository};

    use crate::{
        current_store_id,
        location::update::{
            UpdateLocationError, UpdateLocationService, UpdateLocationServiceTrait,
        },
        service_provider::ServiceConnection,
    };

    #[actix_rt::test]
    async fn update_location_service_errors() {
        let (_, _, connection_manager, _) =
            setup_all("update_location_service_errors", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let location_repository = LocationRepository::new(&connection);
        let service = UpdateLocationService(ServiceConnection::Connection(
            connection_manager.connection().unwrap(),
        ));

        let locations_in_store = location_repository
            .query_by_filter(LocationFilter::new().store_id(|f| f.equal_to(&current_store_id())))
            .unwrap();

        let locations_not_in_store = location_repository
            .query_by_filter(
                LocationFilter::new().store_id(|f| f.not_equal_to(&current_store_id())),
            )
            .unwrap();

        // Location does not exist
        assert_eq!(
            service.update_location(UpdateLocation {
                id: "invalid".to_owned(),
                code: None,
                name: None,
                on_hold: None
            }),
            Err(UpdateLocationError::LocationDoesNotExist)
        );

        // Location for another store
        assert_eq!(
            service.update_location(UpdateLocation {
                id: locations_not_in_store[0].id.clone(),
                code: None,
                name: None,
                on_hold: None
            }),
            Err(UpdateLocationError::LocationDoesNotBelongToCurrentStore)
        );

        // Code used in another store
        assert_eq!(
            service.update_location(UpdateLocation {
                id: locations_in_store[0].id.clone(),
                code: Some(locations_in_store[1].code.clone()),
                name: None,
                on_hold: None
            }),
            Err(UpdateLocationError::CodeAlreadyExists)
        );
    }
    #[actix_rt::test]
    async fn update_location_service_success() {
        let (_, _, connection_manager, _) =
            setup_all("update_location_service_success", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let location_repository = LocationRepository::new(&connection);
        let service = UpdateLocationService(ServiceConnection::Connection(
            connection_manager.connection().unwrap(),
        ));

        let locations_in_store = location_repository
            .query_by_filter(LocationFilter::new().store_id(|f| f.equal_to(&current_store_id())))
            .unwrap();

        // Success with no changes
        let location = locations_in_store[0].clone();
        assert_eq!(
            service.update_location(UpdateLocation {
                id: location.id.clone(),
                code: None,
                name: None,
                on_hold: None
            }),
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
            service.update_location(UpdateLocation {
                id: location.id.clone(),
                code: Some(location.code.clone()),
                name: Some(location.name.clone()),
                on_hold: Some(location.on_hold),
            }),
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
