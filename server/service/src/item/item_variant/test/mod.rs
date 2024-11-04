#[cfg(test)]
mod query {
    use repository::item_variant::item_variant::ItemVariantFilter;
    use repository::mock::{mock_item_a, mock_item_b, MockDataInserts};
    use repository::test_db::setup_all;
    use repository::{EqualFilter, StringFilter};
    use util::uuid::uuid;

    use crate::item::item_variant::{DeleteItemVariant, UpsertItemVariantWithPackaging};
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn create_edit_delete_item_variant() {
        let (_, _, connection_manager, _) = setup_all(
            "create_edit_delete_item_variant",
            MockDataInserts::none().items(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
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

        // Create another item variant for item_a
        let _item_a_variant_b = service
            .upsert_item_variant(
                &context,
                UpsertItemVariantWithPackaging {
                    id: uuid(),
                    item_id: mock_item_a().id,
                    name: "item_a_variant_b".to_string(),
                    ..Default::default()
                },
            )
            .unwrap();

        // Create a new item variant for item_b
        let _item_b_variant_a = service
            .upsert_item_variant(
                &context,
                UpsertItemVariantWithPackaging {
                    id: uuid(),
                    item_id: mock_item_b().id,
                    name: "item_b_variant_a".to_string(),
                    ..Default::default()
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
        assert_eq!(item_variant.rows[0].id, test_item_a_variant_id);

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
        assert_eq!(item_variant.rows[0].id, test_item_a_variant_id);

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
        assert_eq!(item_variant.rows[0].id, test_item_a_variant_id.to_string(),);

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
    }

    #[actix_rt::test]
    async fn validate_item_variant() {
        // TODO validation tests

        // Test that the item variant name is set?

        // Test that we can't create a record with an item_id that doesn't exist

        // Test that we can't change the item_id on an existing record???

        // Test that we can't create/update a record with an invalid cold_storage_id

        // Test name should be unique for an item?
    }
}
