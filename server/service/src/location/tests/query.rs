#[cfg(test)]
mod query {
    use repository::{
        location::{LocationFilter, LocationSortField},
        mock::{mock_asset_b, mock_location_1, MockDataInserts},
        test_db::setup_all,
    };
    use repository::{EqualFilter, PaginationOption, Sort};

    use crate::{
        asset::update::UpdateAsset, service_provider::ServiceProvider, ListError, SingleRecordError,
    };

    #[actix_rt::test]
    async fn location_service_pagination() {
        let (_, _, connection_manager, _) =
            setup_all("test_location_service_pagination", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.location_service;

        assert_eq!(
            service.get_locations(
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
            service.get_locations(
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
    async fn location_service_single_record() {
        let (_, _, connection_manager, _) =
            setup_all("test_location_single_record", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.location_service;

        assert_eq!(
            service.get_location(&context, "invalid_id".to_owned()),
            Err(SingleRecordError::NotFound("invalid_id".to_owned()))
        );

        let result = service
            .get_location(&context, "location_on_hold".to_owned())
            .unwrap();

        assert_eq!(result.location_row.id, "location_on_hold");
        assert!(result.location_row.on_hold);
    }

    #[actix_rt::test]
    async fn location_service_filter() {
        let (_, _, connection_manager, _) =
            setup_all("test_location_filter", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.location_service;

        let result = service
            .get_locations(
                &context,
                None,
                Some(LocationFilter::new().id(EqualFilter::equal_to("location_1"))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(result.rows[0].location_row.id, "location_1");

        let result = service
            .get_locations(
                &context,
                None,
                Some(LocationFilter::new().id(EqualFilter::equal_any(vec![
                    "location_1".to_owned(),
                    "location_on_hold".to_owned(),
                ]))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 2);
        assert_eq!(result.rows[0].location_row.id, "location_1");
        assert_eq!(result.rows[1].location_row.id, "location_on_hold");
    }

    #[actix_rt::test]
    async fn location_service_sort() {
        let (mock_data, _, connection_manager, _) =
            setup_all("test_location_sort", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.location_service;
        // Test Name sort with default sort order
        let result = service
            .get_locations(
                &context,
                None,
                None,
                Some(Sort {
                    key: LocationSortField::Name,
                    desc: None,
                }),
            )
            .unwrap();

        let mut locations = mock_data["base"].locations.clone();
        locations.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        let result_names: Vec<String> = result
            .rows
            .into_iter()
            .map(|location| location.location_row.name)
            .collect();
        let sorted_names: Vec<String> = locations
            .into_iter()
            .map(|location| location.name)
            .collect();

        assert_eq!(result_names, sorted_names);

        // Test Name sort with desc sort
        let result = service
            .get_locations(
                &context,
                None,
                None,
                Some(Sort {
                    key: LocationSortField::Name,
                    desc: Some(true),
                }),
            )
            .unwrap();

        let mut locations = mock_data["base"].locations.clone();
        locations.sort_by(|a, b| b.name.to_lowercase().cmp(&a.name.to_lowercase()));

        let result_names: Vec<String> = result
            .rows
            .into_iter()
            .map(|location| location.location_row.name)
            .collect();
        let sorted_names: Vec<String> = locations
            .into_iter()
            .map(|location| location.name)
            .collect();

        assert_eq!(result_names, sorted_names);
    }

    #[actix_rt::test]
    async fn location_service_assigned_to_asset() {
        let (_mock_data, _, connection_manager, _) =
            setup_all("test_location_asset_assigned", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.location_service;

        // Check location 1 is not assigned to an asset
        let result = service
            .get_locations(
                &context,
                None,
                Some(
                    LocationFilter::new()
                        .id(EqualFilter::equal_to("location_1"))
                        .assigned_to_asset(true),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 0);

        // assign location_1 to an asset
        let asset_service = service_provider.asset_service;
        let _result = asset_service
            .update_asset(
                &context,
                UpdateAsset {
                    id: mock_asset_b().id, // Using mock_asset_b as it has the same store as mock_location_1
                    location_ids: Some(vec![mock_location_1().id]),
                    ..Default::default()
                },
            )
            .unwrap();

        // Check location 1 is assigned to an asset
        let result = service
            .get_locations(
                &context,
                None,
                Some(
                    LocationFilter::new()
                        .id(EqualFilter::equal_to("location_1"))
                        .assigned_to_asset(true),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 1);
    }
}
