#[cfg(test)]
mod query_catalogue_item {

    use repository::{
        assets::asset_catalogue_item::{AssetCatalogueItemFilter, AssetCatalogueItemSortField},
        mock::MockDataInserts,
        test_db::setup_all,
        StringFilter,
    };
    use repository::{EqualFilter, PaginationOption, Sort};

    use crate::{service_provider::ServiceProvider, ListError};

    // note - no mocks required because data is created in migration V1_08_00

    #[actix_rt::test]
    async fn catalogue_service_pagination() {
        let (_, _, connection_manager, _) =
            setup_all("test_catalogue_service_pagination", MockDataInserts::none()).await;
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.catalogue_service;

        assert_eq!(
            service.get_asset_catalogue_items(
                &context.connection,
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
            service.get_asset_catalogue_items(
                &context.connection,
                Some(PaginationOption {
                    limit: Some(0),
                    offset: None
                }),
                None,
                None,
            ),
            Err(ListError::LimitBelowMin(1))
        )
    }

    #[actix_rt::test]
    async fn catalogue_service_filter() {
        let (_, _, connection_manager, _) =
            setup_all("test_catalogue_service_filter", MockDataInserts::none()).await;
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.catalogue_service;

        // id equal_any
        let mut result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(
                    AssetCatalogueItemFilter::new().id(EqualFilter::equal_any(vec![
                        "f9e939e2-825d-4b22-a1d0-4983a8c4c2c0".to_owned(),
                        "c3332de5-a553-4047-a7e4-8ad61325348f".to_owned(),
                    ])),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 2);
        assert_eq!(result.rows[0].code, "E003/108");

        // id equal_any - no matches
        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(
                    AssetCatalogueItemFilter::new().id(EqualFilter::equal_any(vec![
                        "id-that-does-not-exist".to_owned(),
                    ])),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 0);

        // category filter - equal to
        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(
                    AssetCatalogueItemFilter::new()
                        .category(StringFilter::equal_to("Refrigerators and Freezers")),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 98);

        // category filter - equal like
        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(AssetCatalogueItemFilter::new().category(StringFilter::like("Refrigerato"))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 98);

        // category filter - no matches

        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(
                    AssetCatalogueItemFilter::new()
                        .category(StringFilter::like("string-with-no-matches")),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 0);

        // type filter - equal to
        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(
                    AssetCatalogueItemFilter::new()
                        .r#type(StringFilter::equal_to("Icelined Refrigerator")),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 15);

        // type filter - equal like
        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(AssetCatalogueItemFilter::new().r#type(StringFilter::like("Refrigerator"))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 151);

        // type filter - no matches
        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(
                    AssetCatalogueItemFilter::new()
                        .r#type(StringFilter::like("type-search-with-no-matches")),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 0);

        // class filter - equal to
        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(
                    AssetCatalogueItemFilter::new()
                        .class(StringFilter::equal_to("Cold Chain Equipment")),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 158);

        // class filter - equal like
        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(AssetCatalogueItemFilter::new().class(StringFilter::like("Cold"))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 158);

        // class filter - no matches
        let result_1 = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(AssetCatalogueItemFilter::new().class(StringFilter::like(""))),
                None,
            )
            .unwrap();
        assert_eq!(result_1.count, 158);

        // class filter - no matches
        let result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(AssetCatalogueItemFilter::new().class(StringFilter::like(
                    "some string which does not match anything",
                ))),
                None,
            )
            .unwrap();
        assert_eq!(result.count, 0);

        // add query with multiple filters of different types with one not passing
        let result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(
                    AssetCatalogueItemFilter::new()
                        .class(StringFilter::like(
                            "some string which does not match anything",
                        ))
                        .id(EqualFilter::equal_any(vec![
                            "f9e939e2-825d-4b22-a1d0-4983a8c4c2c0".to_owned(),
                        ])),
                ),
                None,
            )
            .unwrap();
        assert_eq!(result.count, 0);

        // add query with multiple filters of different types with one type passing
        let result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(
                    AssetCatalogueItemFilter::new()
                        .class(StringFilter::like("Cold Chain Equipment"))
                        .category(StringFilter::equal_to("Refrigerators and Freezers"))
                        .r#type(StringFilter::equal_any(vec![
                            "Icelined Refrigerator".to_owned(),
                            "Vaccine Carrier LR 3L".to_owned(),
                        ])),
                ),
                None,
            )
            .unwrap();
        assert_eq!(result.count, 1);
        assert_eq!(result.rows[0].code, "E003/108");

        // add query which combines special-type filters which conflict
        let result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(
                    AssetCatalogueItemFilter::new()
                        .class(StringFilter::like("Cold Chain Equipment"))
                        .category(StringFilter::equal_to("Refrigerators and Freezers"))
                        .r#type(StringFilter::equal_any(vec![
                            "Freeze-Free Vaccine Carrier Long Range".to_owned(),
                            "Vaccine Carrier LR 3L".to_owned(),
                        ])),
                ),
                None,
            )
            .unwrap();
        assert_eq!(result.count, 0);
    }

    #[actix_rt::test]
    async fn catalogue_service_sort() {
        let (_, _, connection_manager, _) =
            setup_all("test_catalogue_service_sort", MockDataInserts::none()).await;
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.catalogue_service;
        // Test Name sort with default sort order
        let result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                None,
                Some(Sort {
                    key: AssetCatalogueItemSortField::Code,
                    desc: None,
                }),
            )
            .unwrap();
        assert_eq!(result.rows[0].code, "E003/002");
    }
}
