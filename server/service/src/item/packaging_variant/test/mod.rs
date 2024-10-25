#[cfg(test)]
mod query {
    use repository::item_variant::packaging_variant::PackagingVariantFilter;
    use repository::mock::{mock_item_a, MockDataInserts};
    use repository::test_db::setup_all;
    use repository::EqualFilter;

    use crate::item::item_variant::UpsertItemVariant;
    use crate::item::packaging_variant::{DeletePackagingVariant, UpsertPackagingVariant};
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn create_edit_delete_packaging_variant() {
        let (_, _, connection_manager, _) = setup_all(
            "create_edit_delete_packaging_variant",
            MockDataInserts::none().items(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.item_service;

        let test_item_variant_id = "test_item_variant_id";
        let test_packaging_variant_id = "test_packaging_variant_id";

        // Create a new item variant
        let item_variant = service
            .upsert_item_variant(
                &context,
                UpsertItemVariant {
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
                    item_variant_id: item_variant.id,
                    name: "packaging_variant_a".to_string(),
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
            .upsert_item_variant(
                &context,
                UpsertItemVariant {
                    id: test_item_variant_id.to_string(),
                    item_id: "item_a".to_string(),
                    name: "updated_name".to_string(),
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
        // TODO validation tests

        // Test that the name is set?

        // Test that we can't create a record with an item_variant_id that doesn't exist

        // Test that we can't change the item_variant_id on an existing record???

        // Test that the following fields are all > 0 if supplied...
        /*
        packaging_level: i32,
        pack_size: Option<f64>,
        volume_per_unit: Option<f64>,
         */
    }
}
