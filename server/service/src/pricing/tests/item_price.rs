#[cfg(test)]
mod query {
    use repository::mock::{mock_item_a, mock_item_b, mock_item_c, mock_item_d, mock_name_store_a};
    use repository::{
        MasterListLineRow, MasterListLineRowRepository, MasterListRow, MasterListRowRepository,
    };
    use repository::{mock::MockDataInserts, test_db::setup_all};

    use crate::pricing::item_price::{
        ItemPriceLookup, get_default_prices_for_items, get_pricing_for_items,
    };
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn discount_from_master_list() {
        let (_, _, connection_manager, _) = setup_all(
            "discount_from_master_list",
            MockDataInserts::none().items().names().stores(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.pricing_service;

        let discount = 10.0; // 10% discount

        // Create a discount list with 10% discount
        let discount_list = MasterListRow {
            id: "discount_list".to_string(),
            name: "discount_list".to_string(),
            discount_percentage: Some(discount),
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
            item_id: mock_item_a().id.clone(),
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
                    item_ids: vec![mock_item_a().id],
                    customer_name_id: Some(mock_name_store_a().id),
                },
            )
            .unwrap()
            .remove(&mock_item_a().id)
            .unwrap();

        assert_eq!(pricing.discount_percentage, Some(discount));

        // Check that the discount is not applied if item is not in the discount list

        let pricing = service
            .get_pricing_for_item(
                &context,
                ItemPriceLookup {
                    item_ids: vec![mock_item_b().id],
                    customer_name_id: Some(mock_name_store_a().id),
                },
            )
            .unwrap()
            .remove(&mock_item_b().id)
            .unwrap();

        assert_eq!(pricing.default_price_per_unit, None);
        assert_eq!(pricing.calculated_price_per_unit, None);
        assert_eq!(pricing.discount_percentage, None);
    }

    #[actix_rt::test]
    async fn default_price_list() {
        let (_, _, connection_manager, _) = setup_all(
            "default_price_list",
            MockDataInserts::none().items().names().stores(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
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
            item_id: mock_item_a().id.clone(),
            price_per_unit: Some(default_price_per_unit),
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
                    item_ids: vec![mock_item_a().id],
                    customer_name_id: None,
                },
            )
            .unwrap()
            .remove(&mock_item_a().id)
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
                    item_ids: vec![mock_item_b().id],
                    customer_name_id: Some(mock_name_store_a().id),
                },
            )
            .unwrap()
            .remove(&mock_item_b().id)
            .unwrap();

        assert_eq!(pricing.default_price_per_unit, None);
        assert_eq!(pricing.calculated_price_per_unit, None);
        assert_eq!(pricing.discount_percentage, None);
    }

    #[actix_rt::test]
    async fn default_price_plus_discount() {
        let (_, _, connection_manager, _) = setup_all(
            "default_price_plus_discount",
            MockDataInserts::none().items().names().stores(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
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
            item_id: mock_item_a().id.clone(),
            price_per_unit: Some(default_price_per_unit),
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
            discount_percentage: Some(discount),
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
            item_id: mock_item_a().id.clone(),
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
                    item_ids: vec![mock_item_a().id],
                    customer_name_id: None,
                },
            )
            .unwrap()
            .remove(&mock_item_a().id)
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
                    item_ids: vec![mock_item_b().id],
                    customer_name_id: Some(mock_name_store_a().id),
                },
            )
            .unwrap()
            .remove(&mock_item_b().id)
            .unwrap();

        assert_eq!(pricing.default_price_per_unit, None);
        assert_eq!(pricing.calculated_price_per_unit, None);
        assert_eq!(pricing.discount_percentage, None);
    }

    // Several items priced in one lookup: one on the list, one on it twice
    // (the higher line id wins), one whose line has no price, one on none
    #[actix_rt::test]
    async fn default_prices_for_several_items() {
        let (_, connection, _, _) = setup_all(
            "default_prices_for_several_items",
            MockDataInserts::none().items().names().stores(),
        )
        .await;

        MasterListRowRepository::new(&connection)
            .upsert_one(&MasterListRow {
                id: "default_price_list".to_string(),
                name: "default_price_list".to_string(),
                is_default_price_list: true,
                is_active: true,
                ..Default::default()
            })
            .unwrap();
        // Not a default price list, so its price is ignored
        MasterListRowRepository::new(&connection)
            .upsert_one(&MasterListRow {
                id: "other_list".to_string(),
                name: "other_list".to_string(),
                is_active: true,
                ..Default::default()
            })
            .unwrap();

        let line = |id: &str, master_list_id: &str, item_id: String, price: Option<f64>| {
            MasterListLineRowRepository::new(&connection)
                .upsert_one(&MasterListLineRow {
                    id: id.to_string(),
                    master_list_id: master_list_id.to_string(),
                    item_id,
                    price_per_unit: price,
                    ..Default::default()
                })
                .unwrap();
        };
        line("line_1", "default_price_list", mock_item_a().id, Some(0.5));
        line("line_2", "default_price_list", mock_item_b().id, Some(1.0));
        line("line_3", "default_price_list", mock_item_b().id, Some(1.25));
        line("line_4", "default_price_list", mock_item_c().id, None);
        line("line_5", "other_list", mock_item_d().id, Some(9.0));

        let item_ids = vec![
            mock_item_a().id,
            mock_item_b().id,
            mock_item_c().id,
            mock_item_d().id,
        ];
        let prices = get_default_prices_for_items(&connection, &item_ids).unwrap();

        assert_eq!(prices.get(&mock_item_a().id), Some(&Some(0.5)));
        assert_eq!(prices.get(&mock_item_b().id), Some(&Some(1.25)));
        assert_eq!(prices.get(&mock_item_c().id), Some(&None));
        assert_eq!(prices.get(&mock_item_d().id), None);

        // The full pricing lookup gives each item the same default price
        let pricing = get_pricing_for_items(
            &connection,
            ItemPriceLookup {
                item_ids: item_ids.clone(),
                customer_name_id: None,
            },
        )
        .unwrap();
        for item_id in &item_ids {
            assert_eq!(
                pricing.get(item_id).unwrap().default_price_per_unit,
                prices.get(item_id).copied().flatten()
            );
        }
    }
}
