#[cfg(test)]
mod query {
    use repository::activity_log::ActivityLogFilter;
    use repository::item_variant::bundled_item::BundledItemFilter;
    use repository::item_variant::item_variant::ItemVariantFilter;
    use repository::mock::{
        mock_item_a, mock_item_b, mock_name_c, mock_name_store_b, mock_store_a,
        mock_user_account_a, MockDataInserts,
    };
    use repository::test_db::setup_all;
    use repository::{ActivityLogType, EqualFilter, StringFilter};
    use util::uuid::uuid;

    use crate::activity_log::get_activity_logs;
    use crate::item::bundled_item::UpsertBundledItem;
    use crate::item::item_variant::{
        DeleteItemVariant, UpsertItemVariantError, UpsertItemVariantWithPackaging,
    };
    use crate::service_provider::ServiceProvider;
    use crate::NullableUpdate;

    #[actix_rt::test]
    async fn create_edit_delete_item_variant() {
        let (_, _, connection_manager, _) = setup_all(
            "create_edit_delete_item_variant",
            MockDataInserts::none()
                .items()
                .user_accounts()
                .names()
                .stores()
                .name_store_joins(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.item_service;

        let test_item_a_variant_id = "test_item_variant_id";

        // Create a new item variant for item_a
        let _item_a_variant_a = service
            .upsert_item_variant(
                &context,
                UpsertItemVariantWithPackaging {
                    id: test_item_a_variant_id.to_string(),
                    item_id: mock_item_a().id,
                    name: "item_a_variant_a".to_string(),
                    ..Default::default()
                },
            )
            .unwrap();

        // Log created
        assert_eq!(
            get_activity_logs(&connection_manager, None, None, None)
                .unwrap()
                .rows
                .len(),
            1
        );

        // Create another item variant for item_a
        let _item_a_variant_b = service
            .upsert_item_variant(
                &context,
                UpsertItemVariantWithPackaging {
                    id: uuid(),
                    item_id: mock_item_a().id,
                    name: "item_a_variant_b".to_string(),
                    manufacturer_id: Some(NullableUpdate {
                        value: Some(mock_name_store_b().id),
                    }),
                    ..Default::default()
                },
            )
            .unwrap();

        let test_item_b_variant_id = "test_item_b_variant_id";

        // Create a new item variant for item_b
        let _item_b_variant_a = service
            .upsert_item_variant(
                &context,
                UpsertItemVariantWithPackaging {
                    id: test_item_b_variant_id.to_string(),
                    item_id: mock_item_b().id,
                    name: "item_b_variant_a".to_string(),
                    ..Default::default()
                },
            )
            .unwrap();

        // Bundle item_a_variant_a with item_b_variant_a
        let _bundled_item = service
            .upsert_bundled_item(
                &context,
                UpsertBundledItem {
                    id: uuid(),
                    principal_item_variant_id: test_item_b_variant_id.to_string(),
                    bundled_item_variant_id: test_item_a_variant_id.to_string(),
                    ratio: 1.0,
                },
            )
            .unwrap();

        // Query the item variant by name
        let item_variant = service
            .get_item_variants(
                &context,
                None,
                Some(ItemVariantFilter::new().name(StringFilter::equal_to("item_a_variant_a"))),
                None,
            )
            .unwrap();

        assert_eq!(item_variant.count, 1);
        assert_eq!(
            item_variant.rows[0].item_variant_row.id,
            test_item_a_variant_id
        );

        // Update the name
        let _item_variant = service
            .upsert_item_variant(
                &context,
                UpsertItemVariantWithPackaging {
                    id: test_item_a_variant_id.to_string(),
                    item_id: mock_item_a().id,
                    name: "updated_name".to_string(),
                    ..Default::default()
                },
            )
            .unwrap();

        // Name update log
        let name_update_log = get_activity_logs(
            &connection_manager,
            None,
            Some(
                ActivityLogFilter::new()
                    .r#type(ActivityLogType::ItemVariantUpdatedName.equal_to())
                    .record_id(EqualFilter::equal_to(test_item_a_variant_id)),
            ),
            None,
        )
        .unwrap();

        assert_eq!(
            name_update_log.rows[0].activity_log_row.changed_from,
            Some("item_a_variant_a".to_string())
        );
        assert_eq!(
            name_update_log.rows[0].activity_log_row.changed_to,
            Some("updated_name".to_string())
        );

        // Query the item variant by name
        let item_variant = service
            .get_item_variants(
                &context,
                None,
                Some(ItemVariantFilter::new().name(StringFilter::equal_to("updated_name"))),
                None,
            )
            .unwrap();

        assert_eq!(item_variant.count, 1);
        assert_eq!(
            item_variant.rows[0].item_variant_row.id,
            test_item_a_variant_id
        );

        // Query the item variant by id
        let item_variant = service
            .get_item_variants(
                &context,
                None,
                Some(ItemVariantFilter::new().id(EqualFilter::equal_to(test_item_a_variant_id))),
                None,
            )
            .unwrap();

        assert_eq!(item_variant.count, 1);
        assert_eq!(
            item_variant.rows[0].item_variant_row.id,
            test_item_a_variant_id.to_string(),
        );

        // Delete the item variant
        service
            .delete_item_variant(
                &context,
                DeleteItemVariant {
                    id: test_item_a_variant_id.to_string(),
                },
            )
            .unwrap();

        // Check that the delete worked
        let item_variant = service
            .get_item_variants(
                &context,
                None,
                Some(ItemVariantFilter::new().id(EqualFilter::equal_to(test_item_a_variant_id))),
                None,
            )
            .unwrap();

        assert_eq!(item_variant.count, 0);

        // Check that delete also soft deleted the bundled item record

        let bundled_item = service
            .get_bundled_items(
                &context,
                None,
                Some(
                    BundledItemFilter::new()
                        .principal_item_variant_id(EqualFilter::equal_to(test_item_b_variant_id)),
                ),
            )
            .unwrap();
        assert_eq!(bundled_item.count, 0);
    }

    #[actix_rt::test]
    async fn validate_item_variant() {
        let (_, _, connection_manager, _) = setup_all(
            "validate_item_variant",
            MockDataInserts::none()
                .items()
                .user_accounts()
                .names()
                .stores()
                .name_store_joins(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context("".to_string(), mock_user_account_a().id)
            .unwrap();
        let service = service_provider.item_service;
        let test_item_a_variant_id = "test_item_variant_id";

        // Test that we can't create a record with an item_id that doesn't exist
        let result = service.upsert_item_variant(
            &context,
            UpsertItemVariantWithPackaging {
                id: test_item_a_variant_id.to_string(),
                item_id: uuid(),
                name: "Variant 1".to_string(),
                ..Default::default()
            },
        );
        assert_eq!(
            result.unwrap_err(),
            UpsertItemVariantError::ItemDoesNotExist
        );

        // Test that we can't change the item_id on an existing record???

        // Create a new item variant for item_a
        let _item_a_variant_a = service
            .upsert_item_variant(
                &context,
                UpsertItemVariantWithPackaging {
                    id: test_item_a_variant_id.to_string(),
                    item_id: mock_item_a().id,
                    name: "item_a_variant_a".to_string(),
                    ..Default::default()
                },
            )
            .unwrap();

        // Try to change the item_id
        let result = service.upsert_item_variant(
            &context,
            UpsertItemVariantWithPackaging {
                id: test_item_a_variant_id.to_string(),
                item_id: mock_item_b().id,
                name: "Variant 1".to_string(),
                ..Default::default()
            },
        );
        assert_eq!(result.unwrap_err(), UpsertItemVariantError::CantChangeItem);

        // Test that we can't create/update a record with an invalid cold_storage_id
        let result = service.upsert_item_variant(
            &context,
            UpsertItemVariantWithPackaging {
                id: test_item_a_variant_id.to_string(),
                item_id: mock_item_a().id,
                name: "Variant 1".to_string(),
                cold_storage_type_id: Some(NullableUpdate {
                    value: Some(uuid()),
                }),
                ..Default::default()
            },
        );
        assert_eq!(
            result.unwrap_err(),
            UpsertItemVariantError::ColdStorageTypeDoesNotExist
        );

        // Test: name should be unique for an item

        // Add another item variant for item_a with the same name
        let result = service.upsert_item_variant(
            &context,
            UpsertItemVariantWithPackaging {
                id: uuid(),
                item_id: mock_item_a().id,
                name: "item_a_variant_a".to_string(),
                ..Default::default()
            },
        );
        assert_eq!(result.unwrap_err(), UpsertItemVariantError::DuplicateName);

        // Test manufacturer not visible
        let result = service.upsert_item_variant(
            &context,
            UpsertItemVariantWithPackaging {
                id: uuid(),
                item_id: mock_item_a().id,
                name: "OtherPartyNotVisible".to_string(),
                manufacturer_id: Some(NullableUpdate {
                    value: Some(mock_name_c().id),
                }),
                ..Default::default()
            },
        );
        assert_eq!(
            result.unwrap_err(),
            UpsertItemVariantError::OtherPartyNotVisible
        );
    }
}
