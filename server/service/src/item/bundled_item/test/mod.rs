#[cfg(test)]
mod query {
    use repository::item_variant::bundled_item::BundledItemFilter;
    use repository::mock::{
        mock_item_a_variant_1, mock_item_a_variant_2, mock_item_b_variant_1, mock_item_b_variant_2,
        mock_item_c_variant_1, MockDataInserts,
    };
    use repository::test_db::setup_all;
    use repository::EqualFilter;
    use util::uuid::uuid;

    use crate::item::bundled_item::{DeleteBundledItem, UpsertBundledItem, UpsertBundledItemError};
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn create_edit_delete_bundled_item() {
        let (_, _, connection_manager, _) = setup_all(
            "create_edit_delete_bundled_item",
            MockDataInserts::none().item_variants(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.item_service;

        let test_bundled_item_record_id = "test_bundled_item_id";

        // Create a new bundled item for item_a_variant_1 to bundle with item_b_variant_1
        service
            .upsert_bundled_item(
                &context,
                UpsertBundledItem {
                    id: test_bundled_item_record_id.to_string(),
                    principal_item_variant_id: mock_item_a_variant_1().id,
                    bundled_item_variant_id: mock_item_b_variant_1().id,
                    ratio: 1.0,
                },
            )
            .unwrap();

        // Create a new bundled item for item_a_variant_2 to bundle with item_b_variant_2
        // This is just to make sure that we can have multiple bundled items in the db
        service
            .upsert_bundled_item(
                &context,
                UpsertBundledItem {
                    id: uuid(),
                    principal_item_variant_id: mock_item_a_variant_2().id,
                    bundled_item_variant_id: mock_item_b_variant_2().id,
                    ratio: 1.0,
                },
            )
            .unwrap();

        // Update the ratio
        let _bundled_item = service
            .upsert_bundled_item(
                &context,
                UpsertBundledItem {
                    id: test_bundled_item_record_id.to_string(),
                    principal_item_variant_id: mock_item_a_variant_1().id,
                    bundled_item_variant_id: mock_item_b_variant_1().id,
                    ratio: 2.0,
                },
            )
            .unwrap();

        // Query the bundled item by id
        let bundled_item = service
            .get_bundled_items(
                &context,
                None,
                Some(
                    BundledItemFilter::new().id(EqualFilter::equal_to(test_bundled_item_record_id)),
                ),
            )
            .unwrap();

        assert_eq!(bundled_item.count, 1);
        assert_eq!(
            bundled_item.rows[0].id,
            test_bundled_item_record_id.to_string(),
        );
        assert_eq!(bundled_item.rows[0].ratio, 2.0);

        // Delete the bundled item
        service
            .delete_bundled_item(
                &context,
                DeleteBundledItem {
                    id: test_bundled_item_record_id.to_string(),
                },
            )
            .unwrap();

        // Check that the delete worked
        let bundled_item = service
            .get_bundled_items(
                &context,
                None,
                Some(
                    BundledItemFilter::new().id(EqualFilter::equal_to(test_bundled_item_record_id)),
                ),
            )
            .unwrap();

        assert_eq!(bundled_item.count, 0);
    }

    #[actix_rt::test]
    async fn validate_bundled_item() {
        let (_, _, connection_manager, _) = setup_all(
            "validate_bundled_item",
            MockDataInserts::none().item_variants(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.item_service;

        let test_bundled_item_record_id = "test_bundled_item_id";

        // Check that the two item variants can not the same
        let result = service.upsert_bundled_item(
            &context,
            UpsertBundledItem {
                id: test_bundled_item_record_id.to_string(),
                principal_item_variant_id: mock_item_a_variant_1().id,
                bundled_item_variant_id: mock_item_a_variant_1().id,
                ratio: 1.0,
            },
        );

        assert_eq!(
            result.unwrap_err(),
            UpsertBundledItemError::CanNotBundleItemWithItself
        );

        // Check that the two item variants are not from the same item (that would be bad)
        let result = service.upsert_bundled_item(
            &context,
            UpsertBundledItem {
                id: test_bundled_item_record_id.to_string(),
                principal_item_variant_id: mock_item_a_variant_1().id,
                bundled_item_variant_id: mock_item_a_variant_2().id,
                ratio: 1.0,
            },
        );

        assert_eq!(
            result.unwrap_err(),
            UpsertBundledItemError::CanNotBundleItemWithItself
        );

        // Test that we can't bundle the same 2 variants multiple times (otherwise could configure same bundle with different ratios, which one should we pick?)

        // Create a new bundled item for item_a_variant_1 to bundle with item_b_variant_1
        service
            .upsert_bundled_item(
                &context,
                UpsertBundledItem {
                    id: "valid_bundled_item_id".to_string(),
                    principal_item_variant_id: mock_item_a_variant_1().id,
                    bundled_item_variant_id: mock_item_b_variant_1().id,
                    ratio: 1.0,
                },
            )
            .unwrap();

        // Try to create the same bundled item again with a new ID
        let result = service.upsert_bundled_item(
            &context,
            UpsertBundledItem {
                id: "duplicate_bundled_item_id".to_string(),
                principal_item_variant_id: mock_item_a_variant_1().id,
                bundled_item_variant_id: mock_item_b_variant_1().id,
                ratio: 1.0,
            },
        );

        assert_eq!(
            result.unwrap_err(),
            UpsertBundledItemError::DuplicateBundledItem
        );

        // Prevent nested bundling - check the principal variant isn't the bundled variant in another bundle (and I guess vice versa?)

        // Create a new bundled item for item_b_variant_1 to bundle with item_c_variant_1

        let result = service.upsert_bundled_item(
            &context,
            UpsertBundledItem {
                id: "nested_bundled_item_id".to_string(),
                principal_item_variant_id: mock_item_b_variant_1().id,
                bundled_item_variant_id: mock_item_c_variant_1().id,
                ratio: 1.0,
            },
        );

        assert_eq!(
            result.unwrap_err(),
            UpsertBundledItemError::CanNotNestBundledItems
        );

        let result = service.upsert_bundled_item(
            &context,
            UpsertBundledItem {
                id: "nested_bundled_item_id".to_string(),
                principal_item_variant_id: mock_item_c_variant_1().id,
                bundled_item_variant_id: mock_item_a_variant_1().id,
                ratio: 1.0,
            },
        );

        assert_eq!(
            result.unwrap_err(),
            UpsertBundledItemError::CanNotNestBundledItems
        );

        // A different principal variant with the same bundled variant should be fine
        let result = service.upsert_bundled_item(
            &context,
            UpsertBundledItem {
                id: "nested_bundled_item_id".to_string(),
                principal_item_variant_id: mock_item_c_variant_1().id,
                bundled_item_variant_id: mock_item_b_variant_1().id,
                ratio: 1.0,
            },
        );

        assert!(result.is_ok());
    }
}
