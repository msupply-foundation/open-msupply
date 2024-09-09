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
            .unwrap();

        assert_eq!(pricing.discount_percentage, Some(discount));

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

        assert_eq!(pricing.default_price_per_unit, None);
        assert_eq!(pricing.calculated_price_per_unit, None);
        assert_eq!(pricing.discount_percentage, None);
    }

    #[actix_rt::test]
    async fn default_price_list() {
        let (_, _, connection_manager, _) =
            setup_all("default_price_list", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.pricing_service;

        let default_price_per_unit = 0.03; // 3c per unit

        // Create a default price list
        let default_price_list = MasterListRow {
            id: "default_price_list".to_string(),
            name: "default_price_list".to_string(),
            is_default_price_list: true,
            is_active: true,
            ..Default::default()
        };

        MasterListRowRepository::new(&context.connection)
            .upsert_one(&default_price_list)
            .unwrap();

        // add an item A to the default price list with a price of 3c per unit
        let master_list_line = MasterListLineRow {
            id: "default_price_list_item_1".to_string(),
            master_list_id: "default_price_list".to_string(),
            item_link_id: mock_item_a().id.clone(),
            price_per_unit: Some(default_price_per_unit.clone()),
            ..Default::default()
        };

        MasterListLineRowRepository::new(&context.connection)
            .upsert_one(&master_list_line)
            .unwrap();

        // Check that we get the correct default price + discount, and it's calculated correctly
        let pricing = service
            .get_pricing_for_item(
                &context,
                ItemPriceLookup {
                    item_id: mock_item_a().id.clone(),
                    customer_name_id: None,
                },
            )
            .unwrap();

        assert_eq!(pricing.default_price_per_unit, Some(default_price_per_unit));
        assert_eq!(
            pricing.calculated_price_per_unit,
            Some(default_price_per_unit)
        );

        // Check that there is no pricing if item is not in the discount list

        let pricing = service
            .get_pricing_for_item(
                &context,
                ItemPriceLookup {
                    item_id: mock_item_b().id.clone(),
                    customer_name_id: Some(mock_name_store_a().id.clone()),
                },
            )
            .unwrap();

        assert_eq!(pricing.default_price_per_unit, None);
        assert_eq!(pricing.calculated_price_per_unit, None);
        assert_eq!(pricing.discount_percentage, None);
    }

    #[actix_rt::test]
    async fn default_price_plus_discount() {
        let (_, _, connection_manager, _) =
            setup_all("default_price_plus_discount", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.pricing_service;

        let default_price_per_unit = 0.03; // 3c per unit

        // Create a default price list
        let default_price_list = MasterListRow {
            id: "default_price_list".to_string(),
            name: "default_price_list".to_string(),
            is_default_price_list: true,
            is_active: true,
            ..Default::default()
        };

        MasterListRowRepository::new(&context.connection)
            .upsert_one(&default_price_list)
            .unwrap();

        // add an item A to the default price list with a price of 3c per unit
        let default_price_list_line = MasterListLineRow {
            id: "default_price_list_item_1".to_string(),
            master_list_id: "default_price_list".to_string(),
            item_link_id: mock_item_a().id.clone(),
            price_per_unit: Some(default_price_per_unit.clone()),
            ..Default::default()
        };

        MasterListLineRowRepository::new(&context.connection)
            .upsert_one(&default_price_list_line)
            .unwrap();

        let discount = 5.0; // 5% discount

        // Create a discount list with discount
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
        let discount_list_line = MasterListLineRow {
            id: "discount_list_item_1".to_string(),
            master_list_id: "discount_list".to_string(),
            item_link_id: mock_item_a().id.clone(),
            ..Default::default()
        };

        MasterListLineRowRepository::new(&context.connection)
            .upsert_one(&discount_list_line)
            .unwrap();

        // Check that we get a default price per unit for the item, and it is calculated correctly
        let pricing = service
            .get_pricing_for_item(
                &context,
                ItemPriceLookup {
                    item_id: mock_item_a().id.clone(),
                    customer_name_id: None,
                },
            )
            .unwrap();

        assert_eq!(pricing.default_price_per_unit, Some(default_price_per_unit));
        assert_eq!(pricing.discount_percentage, Some(discount));
        assert_eq!(
            pricing.calculated_price_per_unit,
            Some(default_price_per_unit * (1.0 - discount / 100.0))
        );

        // Check that there is no pricing if item is not in the discount list & not in the default price list
        let pricing = service
            .get_pricing_for_item(
                &context,
                ItemPriceLookup {
                    item_id: mock_item_b().id.clone(),
                    customer_name_id: Some(mock_name_store_a().id.clone()),
                },
            )
            .unwrap();

        assert_eq!(pricing.default_price_per_unit, None);
        assert_eq!(pricing.calculated_price_per_unit, None);
        assert_eq!(pricing.discount_percentage, None);
    }
}
