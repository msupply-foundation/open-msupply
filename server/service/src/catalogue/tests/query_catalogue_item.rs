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
                        "e2285ed2-1492-41c2-8933-79591c179ec5".to_owned(),
                        "f04d5fd1-150d-4ee7-8011-151f74dc42e2".to_owned(),
                    ])),
                ),
                Some(Sort {
                    key: AssetCatalogueItemSortField::Code,
                    desc: None,
                }),
            )
            .unwrap();

        assert_eq!(result.count, 2);
        assert_eq!(result.rows[0].code, "E003/108");
        assert_eq!(result.rows[1].code, "E003/116");

        // id equal_to
        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(AssetCatalogueItemFilter::new().id(EqualFilter::equal_to(
                    "4f13efbe-4349-4fc3-ac22-584728003e63",
                ))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(
            result.rows[0].id,
            "4f13efbe-4349-4fc3-ac22-584728003e63".to_string()
        );

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
                        .category(StringFilter::equal_to("Refrigerators and freezers")),
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
                        .r#type(StringFilter::equal_to("Ice-lined refrigerator")),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 30);

        // type filter - equal like
        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(AssetCatalogueItemFilter::new().r#type(StringFilter::like("Refrigerator"))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 81);

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
                        .class(StringFilter::equal_to("Cold chain equipment")),
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
        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(AssetCatalogueItemFilter::new().class(StringFilter::like(""))),
                None,
            )
            .unwrap();
        assert_eq!(result.count, 158);

        // class filter - no matches
        result = service
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
        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(
                    AssetCatalogueItemFilter::new()
                        .class(StringFilter::like(
                            "some string which does not match anything",
                        ))
                        .id(EqualFilter::equal_any(vec![
                            "9ba05fbe-3a24-4f1b-af33-d45dd9de8fa8".to_owned(),
                        ])),
                ),
                None,
            )
            .unwrap();
        assert_eq!(result.count, 0);

        // add query with multiple filters of different types with one type passing
        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(
                    AssetCatalogueItemFilter::new()
                        .class(StringFilter::like("Cold Chain Equipment"))
                        .category(StringFilter::equal_to("Refrigerators and freezers"))
                        .r#type(StringFilter::equal_any(vec![
                            "Ultralow freezer".to_owned(),
                            "Vaccine carrier".to_owned(),
                        ])),
                ),
                Some(Sort {
                    key: AssetCatalogueItemSortField::Code,
                    desc: None,
                }),
            )
            .unwrap();
        assert_eq!(result.count, 2);
        assert_eq!(result.rows[0].code, "E003/125");

        // add query which combines special-type filters which conflict
        // The category is "Refrigerators and freezers" but type queries are vaccine carrier related
        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(
                    AssetCatalogueItemFilter::new()
                        .class(StringFilter::like("Cold chain equipment"))
                        .category(StringFilter::equal_to("Refrigerators and freezers"))
                        .r#type(StringFilter::equal_any(vec![
                            "Freeze-Free Vaccine Carrier Long Range".to_owned(),
                            "Vaccine Carrier LR 3L".to_owned(),
                        ])),
                ),
                None,
            )
            .unwrap();
        assert_eq!(result.count, 0);

        // In mock data we have
        // asset_a - Class:Cold Chain Equipment Category:Refrigerators and freezers	Type:Vaccine/Waterpacks freezer
        // asset_b - Class:Cold Chain Equipment Category:Insulated Containers	Type:Vaccine Carrier LR 3L

        // 1. Get assets with category = Refrigerators and freezers
        // We expect just 98 results from default data

        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(
                    AssetCatalogueItemFilter::new().category_id(EqualFilter::equal_to(
                        "02cbea92-d5bf-4832-863b-c04e093a7760",
                    )),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 98);
        // assert_eq!(result.rows[0].id, mock_asset_a().id);

        // 2. Get assets with category string = %ted conta% (Insulated containers)
        result = service
            .get_asset_catalogue_items(
                &context.connection,
                None,
                Some(AssetCatalogueItemFilter::new().category(StringFilter::like("ted conta"))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 60);
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
