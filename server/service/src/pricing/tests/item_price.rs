#[cfg(test)]
mod query {
    use repository::mock::{mock_item_a, mock_item_b, mock_name_store_a};
    use repository::{mock::MockDataInserts, test_db::setup_all};
    use repository::{
        MasterListLineRow, MasterListLineRowRepository, MasterListRow, MasterListRowRepository,
    };

    use crate::pricing::item_price::ItemPriceLookup;
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn discount_from_master_list() {
        let (_, _, connection_manager, _) =
            setup_all("discount_from_master_list", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.pricing_service;

        let discount = 10.0; // 10% discount

        // Create a discount list with 10% discount
        let discount_list = MasterListRow {
            id: "discount_list".to_string(),
            name: "discount_list".to_string(),
            discount_percentage: Some(discount.clone()),
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

        // Check that the discount is applied if we have the item in the discount list

        let pricing = service
            .get_pricing_for_item(
                &context,
                ItemPriceLookup {
                    item_id: mock_item_a().id.clone(),
                    customer_name_id: Some(mock_name_store_a().id.clone()),
                },
            )
            .unwrap()
            .unwrap();

        assert_eq!(pricing.discount, Some(discount));

        // Check that the discount is not applied if item is not in the discount list

        let pricing = service
            .get_pricing_for_item(
                &context,
                ItemPriceLookup {
                    item_id: mock_item_b().id.clone(),
                    customer_name_id: Some(mock_name_store_a().id.clone()),
                },
            )
            .unwrap();

        assert_eq!(pricing, None);
    }
}
