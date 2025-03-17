#[cfg(test)]
mod query {
    use repository::item_variant::packaging_variant::PackagingVariantFilter;
    use repository::mock::{mock_item_a, MockDataInserts};
    use repository::test_db::setup_all;
    use repository::EqualFilter;
    use util::uuid::uuid;

    use crate::item::item_variant::UpsertItemVariantWithPackaging;
    use crate::item::packaging_variant::{
        DeletePackagingVariant, UpsertPackagingVariant, UpsertPackagingVariantError,
    };
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn create_edit_delete_packaging_variant() {
        let (_, _, connection_manager, _) = setup_all(
            "create_edit_delete_packaging_variant",
            MockDataInserts::none().items(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.item_service;

        let test_item_variant_id = "test_item_variant_id";
        let test_packaging_variant_id = "test_packaging_variant_id";

        // Create a new item variant
        let item_variant = service
            .upsert_item_variant(
                &context,
                UpsertItemVariantWithPackaging {
                    id: test_item_variant_id.to_string(),
                    item_id: mock_item_a().id,
                    name: "item_variant_a".to_string(),
                    ..Default::default()
                },
            )
            .unwrap();

        // Create a new packaging variant
        let _packaging_variant = service
            .upsert_packaging_variant(
                &context,
                UpsertPackagingVariant {
                    id: test_packaging_variant_id.to_string(),
                    item_variant_id: item_variant.item_variant_row.id,
                    name: "packaging_variant_a".to_string(),
                    packaging_level: 1,
                    ..Default::default()
                },
            )
            .unwrap();

        // Query the packaging variant by id
        let packaging_variant = service
            .get_packaging_variants(
                &context,
                None,
                Some(
                    PackagingVariantFilter::new()
                        .id(EqualFilter::equal_to(test_packaging_variant_id)),
                ),
                None,
            )
            .unwrap();

        assert_eq!(packaging_variant.count, 1);
        assert_eq!(
            packaging_variant.rows[0].id,
            test_packaging_variant_id.to_string()
        );
        assert_eq!(packaging_variant.rows[0].name, "packaging_variant_a");

        // Update the name
        let _packaging_variant = service
            .upsert_packaging_variant(
                &context,
                UpsertPackagingVariant {
                    id: test_packaging_variant_id.to_string(),
                    item_variant_id: test_item_variant_id.to_string(),
                    name: "updated_name".to_string(),
                    packaging_level: 1,
                    ..Default::default()
                },
            )
            .unwrap();

        // Query the packaging variant by id
        let packaging_variant = service
            .get_packaging_variants(
                &context,
                None,
                Some(
                    PackagingVariantFilter::new()
                        .id(EqualFilter::equal_to(test_packaging_variant_id)),
                ),
                None,
            )
            .unwrap();

        assert_eq!(packaging_variant.count, 1);
        assert_eq!(
            packaging_variant.rows[0].id,
            test_packaging_variant_id.to_string()
        );
        assert_eq!(packaging_variant.rows[0].name, "updated_name");

        // Delete the packaging variant
        service
            .delete_packaging_variant(
                &context,
                DeletePackagingVariant {
                    id: test_packaging_variant_id.to_string(),
                },
            )
            .unwrap();

        // Query the packaging variant by id
        let packaging_variant = service
            .get_packaging_variants(
                &context,
                None,
                Some(
                    PackagingVariantFilter::new()
                        .id(EqualFilter::equal_to(&test_packaging_variant_id)),
                ),
                None,
            )
            .unwrap();

        assert_eq!(packaging_variant.count, 0);
    }

    #[actix_rt::test]
    async fn validate_packaging_variant() {
        let (_, _, connection_manager, _) = setup_all(
            "validate_packaging_variant",
            MockDataInserts::none().items(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.item_service;

        let test_item_variant_id = "test_item_variant_id";
        let test_item_variant2_id = "test_item_variant2_id";
        let test_packaging_variant_id = "test_packaging_variant_id";

        // Create a 2 new item variants
        let _item_variant = service
            .upsert_item_variant(
                &context,
                UpsertItemVariantWithPackaging {
                    id: test_item_variant_id.to_string(),
                    item_id: mock_item_a().id,
                    name: "item_variant_a".to_string(),
                    ..Default::default()
                },
            )
            .unwrap();

        let _item_variant2 = service
            .upsert_item_variant(
                &context,
                UpsertItemVariantWithPackaging {
                    id: test_item_variant2_id.to_string(),
                    item_id: mock_item_a().id,
                    name: "item_variant_b".to_string(),
                    ..Default::default()
                },
            )
            .unwrap();

        // Create a new packaging variant
        service
            .upsert_packaging_variant(
                &context,
                UpsertPackagingVariant {
                    id: test_packaging_variant_id.to_string(),
                    item_variant_id: test_item_variant_id.to_string(),
                    name: "packaging_variant_a".to_string(),
                    packaging_level: 1,
                    ..Default::default()
                },
            )
            .unwrap();

        // Test that we can't create a record with an item_variant_id that doesn't exist
        let result = service.upsert_packaging_variant(
            &context,
            UpsertPackagingVariant {
                id: uuid(),
                item_variant_id: "some_id_that_doesn't_exist".to_string(),
                name: "packaging_variant_a".to_string(),
                packaging_level: 1,
                ..Default::default()
            },
        );

        assert_eq!(
            result.unwrap_err(),
            UpsertPackagingVariantError::ItemVariantDoesNotExist
        );

        // Test that we can't change the item_variant_id on an existing record???
        let result = service.upsert_packaging_variant(
            &context,
            UpsertPackagingVariant {
                id: test_packaging_variant_id.to_string(),
                item_variant_id: test_item_variant2_id.to_string(),
                name: "packaging_variant_a".to_string(),
                packaging_level: 1,
                ..Default::default()
            },
        );

        assert_eq!(
            result.unwrap_err(),
            UpsertPackagingVariantError::CantChangeItemVariant
        );

        // Test that we can't create a record with a packaging_level < 0
        let result = service.upsert_packaging_variant(
            &context,
            UpsertPackagingVariant {
                id: test_packaging_variant_id.to_string(),
                item_variant_id: test_item_variant_id.to_string(),
                name: "packaging_variant_a".to_string(),
                packaging_level: -1,
                ..Default::default()
            },
        );
        assert_eq!(
            result.unwrap_err(),
            UpsertPackagingVariantError::LessThanZero("packaging_level".to_string())
        );

        // Test that we can't create a record with a pack_size < 0
        let result = service.upsert_packaging_variant(
            &context,
            UpsertPackagingVariant {
                id: test_packaging_variant_id.to_string(),
                item_variant_id: test_item_variant_id.to_string(),
                name: "packaging_variant_a".to_string(),
                packaging_level: 1,
                pack_size: Some(-1.0),
                ..Default::default()
            },
        );
        assert_eq!(
            result.unwrap_err(),
            UpsertPackagingVariantError::LessThanZero("pack_size".to_string())
        );

        // Test that we can't create a record with a pack_size == 0
        let result = service.upsert_packaging_variant(
            &context,
            UpsertPackagingVariant {
                id: test_packaging_variant_id.to_string(),
                item_variant_id: test_item_variant_id.to_string(),
                name: "packaging_variant_a".to_string(),
                packaging_level: 1,
                pack_size: Some(0.0),
                ..Default::default()
            },
        );
        assert_eq!(
            result.unwrap_err(),
            UpsertPackagingVariantError::LessThanZero("pack_size".to_string())
        );

        // Test that we can't create a record with a pack_size == 0
        let result = service.upsert_packaging_variant(
            &context,
            UpsertPackagingVariant {
                id: test_packaging_variant_id.to_string(),
                item_variant_id: test_item_variant_id.to_string(),
                name: "packaging_variant_a".to_string(),
                packaging_level: 1,
                pack_size: Some(0.0),
                ..Default::default()
            },
        );
        assert_eq!(
            result.unwrap_err(),
            UpsertPackagingVariantError::LessThanZero("pack_size".to_string())
        );

        // Test that we can't create a record with a volume_per_unit < 0
        let result = service.upsert_packaging_variant(
            &context,
            UpsertPackagingVariant {
                id: test_packaging_variant_id.to_string(),
                item_variant_id: test_item_variant_id.to_string(),
                name: "packaging_variant_a".to_string(),
                packaging_level: 1,
                volume_per_unit: Some(-1.0),
                ..Default::default()
            },
        );
        assert_eq!(
            result.unwrap_err(),
            UpsertPackagingVariantError::LessThanZero("volume_per_unit".to_string())
        );

        // Test that we can't create a record with a volume_per_unit == 0
        let result = service.upsert_packaging_variant(
            &context,
            UpsertPackagingVariant {
                id: test_packaging_variant_id.to_string(),
                item_variant_id: test_item_variant_id.to_string(),
                name: "packaging_variant_a".to_string(),
                packaging_level: 1,
                volume_per_unit: Some(0.0),
                ..Default::default()
            },
        );
        assert_eq!(
            result.unwrap_err(),
            UpsertPackagingVariantError::LessThanZero("volume_per_unit".to_string())
        );
    }
}
