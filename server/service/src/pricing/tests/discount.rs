#[cfg(test)]
mod query {
    use repository::mock::{mock_item_a, mock_item_b, mock_name_store_a, mock_name_store_b};
    use repository::{mock::MockDataInserts, test_db::setup_all};
    use repository::{
        MasterListLineRow, MasterListLineRowRepository, MasterListNameJoinRepository,
        MasterListNameJoinRow, MasterListRow, MasterListRowRepository,
    };

    use crate::pricing::discount::ItemDiscountLookup;
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn discount_from_master_list() {
        let (_, _, connection_manager, _) =
            setup_all("discount_from_master_list", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.pricing_service;

        let discount = 0.1; // 10% discount

        // Create a discount list with 10% discount
        let discount_list = MasterListRow {
            id: "discount_list".to_string(),
            name: "discount_list".to_string(),
            discount: Some(discount.clone()),
            is_active: true,
            ..Default::default()
        };

        MasterListRowRepository::new(&context.connection)
            .upsert_one(&discount_list)
            .unwrap();

        // add an item A to the discount list
        let master_list_line = MasterListLineRow {
            id: "discount_list_item_1".to_string(),
            master_list_id: "discount_list".to_string(),
            item_link_id: mock_item_a().id.clone(),
            ..Default::default()
        };

        MasterListLineRowRepository::new(&context.connection)
            .upsert_one(&master_list_line)
            .unwrap();

        // Add the discount list to a name (Store A)
        let master_list_name_join = MasterListNameJoinRow {
            id: "discount_list_name_join".to_string(),
            master_list_id: "discount_list".to_string(),
            name_link_id: mock_name_store_a().id.clone(),
        };

        MasterListNameJoinRepository::new(&context.connection)
            .upsert_one(&master_list_name_join)
            .unwrap();

        // Check that the discount is applied if we have the item in the discount list and the name is associated with the discount list

        let applied_discount = service
            .get_discount_for_item_and_name_link_id(
                &context,
                ItemDiscountLookup {
                    item_id: mock_item_a().id.clone(),
                    name_link_id: mock_name_store_a().id.clone(),
                },
            )
            .unwrap();

        assert_eq!(applied_discount, discount);

        // Check that the discount is not applied if we have a item on the discount list but the name doesn't have the discount list applied

        let applied_discount = service
            .get_discount_for_item_and_name_link_id(
                &context,
                ItemDiscountLookup {
                    item_id: mock_item_a().id.clone(),
                    name_link_id: mock_name_store_b().id.clone(),
                },
            )
            .unwrap();

        assert_eq!(applied_discount, 0.0);

        // Check that the discount is not applied if we have the discount applied to the name but the item is not in the discount list

        let applied_discount = service
            .get_discount_for_item_and_name_link_id(
                &context,
                ItemDiscountLookup {
                    item_id: mock_item_b().id.clone(),
                    name_link_id: mock_name_store_a().id.clone(),
                },
            )
            .unwrap();

        assert_eq!(applied_discount, 0.0);
    }
}
