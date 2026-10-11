#[cfg(test)]
mod query {
    use repository::{
        location::{LocationFilter, LocationSortField},
        mock::{
            mock_asset_b, mock_item_a, mock_location_1, mock_store_a, mock_store_b,
            stock_line_with_volume, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        ItemRow, LocationRow, LocationRowRepository, LocationTypeRow, StockLineRow,
        StockLineRowRepository,
    };
    use repository::{EqualFilter, PaginationOption, Sort};

    use crate::{
        asset::update::UpdateAsset,
        location::query::{
            get_available_volume_by_location_type, get_volume_used, restricted_location_type_id,
        },
        service_provider::ServiceProvider,
        ListError, SingleRecordError,
    };

    #[actix_rt::test]
    async fn location_service_pagination() {
        let (_, _, connection_manager, _) =
            setup_all("test_location_service_pagination", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.location_service;

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

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.location_service;

        assert_eq!(
            service.get_location(&context, "invalid_id".to_string()),
            Err(SingleRecordError::NotFound("invalid_id".to_string()))
        );

        let result = service
            .get_location(&context, "location_on_hold".to_string())
            .unwrap();

        assert_eq!(result.location_row.id, "location_on_hold");
        assert!(result.location_row.on_hold);
    }

    #[actix_rt::test]
    async fn location_service_filter() {
        let (_, _, connection_manager, _) =
            setup_all("test_location_filter", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.location_service;

        let result = service
            .get_locations(
                &context,
                None,
                Some(LocationFilter::new().id(EqualFilter::equal_to("location_1".to_string()))),
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
                    "location_1".to_string(),
                    "location_on_hold".to_string(),
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

        let service_provider = ServiceProvider::new(connection_manager);
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
    async fn location_service_sort_by_name_secondary_sort_by_code() {
        let (_, connection, connection_manager, _) = setup_all(
            "test_location_sort_name_then_code",
            MockDataInserts::none().names().stores(),
        )
        .await;

        // Insert three locations with the same name but different codes,
        // in an order that wouldn't sort correctly by chance (id or insertion order)
        let location_repo = LocationRowRepository::new(&connection);
        location_repo
            .upsert_one(&LocationRow {
                id: "loc_a".to_string(),
                name: "Same Name".to_string(),
                code: "code_c".to_string(),
                store_id: "store_a".to_string(),
                ..Default::default()
            })
            .unwrap();

        location_repo
            .upsert_one(&LocationRow {
                id: "loc_b".to_string(),
                name: "Same Name".to_string(),
                code: "code_a".to_string(),
                store_id: "store_a".to_string(),
                ..Default::default()
            })
            .unwrap();

        location_repo
            .upsert_one(&LocationRow {
                id: "loc_c".to_string(),
                name: "Same Name".to_string(),
                code: "code_b".to_string(),
                store_id: "store_a".to_string(),
                ..Default::default()
            })
            .unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.location_service;

        // Sort by name ascending — secondary sort by code should put code_a first
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

        let result_codes: Vec<String> = result
            .rows
            .into_iter()
            .map(|l| l.location_row.code)
            .collect();

        assert_eq!(result_codes, vec!["code_a", "code_b", "code_c"]);
    }

    #[actix_rt::test]
    async fn location_service_assigned_to_asset() {
        let (_mock_data, _, connection_manager, _) =
            setup_all("test_location_asset_assigned", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.location_service;

        // Check location 1 is not assigned to an asset
        let result = service
            .get_locations(
                &context,
                None,
                Some(
                    LocationFilter::new()
                        .id(EqualFilter::equal_to("location_1".to_string()))
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
                        .id(EqualFilter::equal_to("location_1".to_string()))
                        .assigned_to_asset(true),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 1);
    }

    #[actix_rt::test]
    async fn location_get_volume_used() {
        let (_mock_data, connection, _, _) =
            setup_all("test_location_get_volume_used", MockDataInserts::all()).await;

        // Insert a new empty location
        let location_with_no_stock_lines = LocationRow {
            id: "location_with_no_stock_lines".to_string(),
            store_id: "store_a".to_string(),
            ..Default::default()
        };
        LocationRowRepository::new(&connection)
            .upsert_one(&location_with_no_stock_lines)
            .unwrap();

        // Confirm handles location with no stock lines
        let result = get_volume_used(&connection, &location_with_no_stock_lines).unwrap();
        // Should return 0.0 for no stock lines (using bits to ensure 0.0 and not -0.0)
        assert_eq!(result.to_bits(), 0.0f64.to_bits());

        // Insert some stock lines for the location
        StockLineRowRepository::new(&connection)
            .upsert_one(&StockLineRow {
                id: "line1".to_string(),
                location_id: Some(location_with_no_stock_lines.id.clone()),
                ..stock_line_with_volume() // total volume is 1000.0
            })
            .unwrap();
        StockLineRowRepository::new(&connection)
            .upsert_one(&StockLineRow {
                id: "line2".to_string(),
                location_id: Some(location_with_no_stock_lines.id.clone()),
                total_volume: 500.0,
                ..stock_line_with_volume()
            })
            .unwrap();

        // Adds volumes correctly
        let result = get_volume_used(&connection, &location_with_no_stock_lines).unwrap();
        assert_eq!(result, 1500.0);
    }

    #[actix_rt::test]
    async fn location_get_available_volume_by_location_type() {
        let location_type = |id: &str| LocationTypeRow {
            id: id.to_string(),
            ..Default::default()
        };
        let location = |id: &str, store_id: &str, location_type: &str, volume: f64| LocationRow {
            id: id.to_string(),
            store_id: store_id.to_string(),
            location_type_id: Some(location_type.to_string()),
            volume,
            ..Default::default()
        };
        let stock_line =
            |id: &str, store_id: &str, location_id: &str, packs: f64, volume: f64| StockLineRow {
                id: id.to_string(),
                store_id: store_id.to_string(),
                item_id: mock_item_a().id,
                location_id: Some(location_id.to_string()),
                total_number_of_packs: packs,
                total_volume: volume,
                ..Default::default()
            };

        let (_, connection, _, _) = setup_all_with_data(
            "location_get_available_volume_by_location_type",
            MockDataInserts::all(),
            MockData {
                location_types: vec![
                    location_type("type_x"),
                    location_type("type_y"),
                    location_type("type_no_locations"),
                ],
                locations: vec![
                    location("x_1", &mock_store_a().id, "type_x", 100.0),
                    location("x_2", &mock_store_a().id, "type_x", 50.0),
                    location("y_1", &mock_store_a().id, "type_y", 200.0),
                    // Another store's location of the same type is not ours to fill
                    location("x_other_store", &mock_store_b().id, "type_x", 1000.0),
                ],
                stock_lines: vec![
                    stock_line("in_x_1", &mock_store_a().id, "x_1", 2.0, 30.0),
                    stock_line("in_x_2", &mock_store_a().id, "x_2", 1.0, 10.0),
                    // No packs left, so takes no space
                    stock_line("empty_in_x_2", &mock_store_a().id, "x_2", 0.0, 20.0),
                    stock_line(
                        "in_x_other_store",
                        &mock_store_b().id,
                        "x_other_store",
                        1.0,
                        500.0,
                    ),
                ],
                ..Default::default()
            },
        )
        .await;

        let location_type_ids: Vec<String> = ["type_x", "type_y", "type_no_locations"]
            .iter()
            .map(|id| id.to_string())
            .collect();

        let result = get_available_volume_by_location_type(
            &connection,
            &mock_store_a().id,
            &location_type_ids,
        )
        .unwrap();

        assert_eq!(result.get("type_x"), Some(&(150.0 - 40.0)));
        // Locations but no stock: all of it is free
        assert_eq!(result.get("type_y"), Some(&200.0));
        assert_eq!(result.get("type_no_locations"), None);
        assert_eq!(result.len(), 2);

        // No types asked for, nothing to look up
        assert!(
            get_available_volume_by_location_type(&connection, &mock_store_a().id, &[])
                .unwrap()
                .is_empty()
        );
    }

    #[test]
    fn location_restricted_location_type_id() {
        let item = |restricted_location_type_id: Option<&str>| ItemRow {
            restricted_location_type_id: restricted_location_type_id.map(str::to_string),
            ..Default::default()
        };

        assert_eq!(
            restricted_location_type_id(&item(Some("type_x"))),
            Some("type_x")
        );
        assert_eq!(restricted_location_type_id(&item(None)), None);
        // An empty id means unrestricted
        assert_eq!(restricted_location_type_id(&item(Some(""))), None);
    }
}
