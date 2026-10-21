#[cfg(test)]
mod insert {
    use repository::{
        ActivityLogRowRepository, ActivityLogType, PurchaseOrderLineRowRepository,
        mock::{
            MockDataInserts, mock_item_a, mock_item_b, mock_name_a, mock_store_a,
            mock_user_account_a,
        },
        test_db::setup_all,
    };

    use crate::{
        purchase_order::insert::InsertPurchaseOrderInput,
        purchase_order_line::insert::{InsertPurchaseOrderLineError, InsertPurchaseOrderLineInput},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn insert_purchase_order_line_errors() {
        let (_, _, connection_manager, _) =
            setup_all("insert_purchase_order_line_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.purchase_order_line_service;

        // Purchase Order Does Not Exist
        assert_eq!(
            service.insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id".to_string(),
                    purchase_order_id: "non_existent_purchase_order".to_string(),
                    item_id_or_code: "item_id".to_string(),
                    ..Default::default()
                }
            ),
            Err(InsertPurchaseOrderLineError::PurchaseOrderDoesNotExist)
        );

        // Create a purchase order
        service_provider
            .purchase_order_service
            .insert_purchase_order(
                &context,
                &mock_store_a().id,
                InsertPurchaseOrderInput {
                    id: "purchase_order_id".to_string(),
                    supplier_id: mock_name_a().id.to_string(),
                },
            )
            .unwrap();

        // Item Does Not Exist
        assert_eq!(
            service.insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id".to_string(),
                    purchase_order_id: "purchase_order_id".to_string(),
                    item_id_or_code: "non_existent_item".to_string(),
                    ..Default::default()
                }
            ),
            Err(InsertPurchaseOrderLineError::ItemDoesNotExist)
        );

        // Purchase Order Line Already Exists
        service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id".to_string(),
                    purchase_order_id: "purchase_order_id".to_string(),
                    item_id_or_code: mock_item_a().id.to_string(),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(
            service.insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id".to_string(),
                    purchase_order_id: "purchase_order_id".to_string(),
                    item_id_or_code: mock_item_a().id.to_string(),
                    ..Default::default()
                }
            ),
            Err(InsertPurchaseOrderLineError::PurchaseOrderLineAlreadyExists)
        );
    }

    #[actix_rt::test]
    async fn insert_purchase_order_line_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_purchase_order_line_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.purchase_order_line_service;

        // Create purchase orders
        service_provider
            .purchase_order_service
            .insert_purchase_order(
                &context,
                &mock_store_a().id,
                InsertPurchaseOrderInput {
                    id: "purchase_order_id_1".to_string(),
                    supplier_id: mock_name_a().id.to_string(),
                },
            )
            .unwrap();

        service_provider
            .purchase_order_service
            .insert_purchase_order(
                &context,
                &mock_store_a().id,
                InsertPurchaseOrderInput {
                    id: "purchase_order_id_2".to_string(),
                    supplier_id: mock_name_a().id.to_string(),
                },
            )
            .unwrap();

        // Create purchase order lines for purchase_order_id_1
        let result_1_1 = service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id_1_1".to_string(),
                    purchase_order_id: "purchase_order_id_1".to_string(),
                    item_id_or_code: mock_item_a().id.to_string(),
                    ..Default::default()
                },
            )
            .unwrap();

        // Uses item code
        let result_1_2 = service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id_1_2".to_string(),
                    purchase_order_id: "purchase_order_id_1".to_string(),
                    item_id_or_code: mock_item_a().code.to_string(),
                    requested_pack_size: Some(10.0),
                    ..Default::default()
                },
            )
            .unwrap();

        // Create purchase order lines for purchase_order_id_2
        let result_2_1 = service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id_2_1".to_string(),
                    purchase_order_id: "purchase_order_id_2".to_string(),
                    item_id_or_code: mock_item_a().id.to_string(),
                    ..Default::default()
                },
            )
            .unwrap();

        let result_2_2 = service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id_2_2".to_string(),
                    purchase_order_id: "purchase_order_id_2".to_string(),
                    item_id_or_code: mock_item_a().id.to_string(),
                    requested_pack_size: Some(10.0),
                    ..Default::default()
                },
            )
            .unwrap();

        // Get the purchase order lines from the repository
        let purchase_order_lines_1_1 = PurchaseOrderLineRowRepository::new(&context.connection)
            .find_one_by_id("purchase_order_line_id_1_1")
            .unwrap()
            .unwrap();

        let purchase_order_lines_1_2 = PurchaseOrderLineRowRepository::new(&context.connection)
            .find_one_by_id("purchase_order_line_id_1_2")
            .unwrap()
            .unwrap();

        let purchase_order_lines_2_1 = PurchaseOrderLineRowRepository::new(&context.connection)
            .find_one_by_id("purchase_order_line_id_2_1")
            .unwrap()
            .unwrap();

        let purchase_order_lines_2_2 = PurchaseOrderLineRowRepository::new(&context.connection)
            .find_one_by_id("purchase_order_line_id_2_2")
            .unwrap()
            .unwrap();

        // Assert that the line numbers are set correctly for purchase order id 1
        assert_eq!(purchase_order_lines_1_1.line_number, 1);
        assert_eq!(purchase_order_lines_1_2.line_number, 2);

        // Assert that the line numbers are set correctly for purchase order id 2
        assert_eq!(purchase_order_lines_2_1.line_number, 1);
        assert_eq!(purchase_order_lines_2_2.line_number, 2);

        // Assert that the results match the expected IDs
        assert_eq!(result_1_1.id, purchase_order_lines_1_1.id);
        assert_eq!(result_1_2.id, purchase_order_lines_1_2.id);
        assert_eq!(result_2_1.id, purchase_order_lines_2_1.id);
        assert_eq!(result_2_2.id, purchase_order_lines_2_2.id);

        // test activity log for created: one entry per line, each naming its line
        let created_logs = ActivityLogRowRepository::new(&context.connection)
            .find_many_by_record_id("purchase_order_id_2")
            .unwrap()
            .into_iter()
            .filter(|l| l.r#type == ActivityLogType::PurchaseOrderLineCreated)
            .collect::<Vec<_>>();
        assert_eq!(created_logs.len(), 2);
        let log = &created_logs[1];

        assert_eq!(log.changed_from, None);
        let to: serde_json::Value = serde_json::from_str(log.changed_to.as_ref().unwrap()).unwrap();
        assert_eq!(to.get("line-number"), None);
        assert_eq!(to["item-code"], mock_item_a().code);
        assert_eq!(to["item-name"], mock_item_a().name);
        assert_eq!(to["status"], "NEW");
        assert_eq!(to["pack-size"], 10.0);
        assert_eq!(to["requested-units"], 0.0);
        assert_eq!(to["price-per-pack-before-discount"], 0.0);
        assert_eq!(to.get("adjusted-units"), None);
        assert_eq!(to.get("manufacturer"), None);
    }

    /// The stored total is the after-discount pack price × the packs (units over
    /// pack size), written on insert; a zero pack size stores 0, not an infinity.
    #[actix_rt::test]
    async fn insert_purchase_order_line_stores_line_total() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_purchase_order_line_stores_line_total",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.purchase_order_line_service;

        service_provider
            .purchase_order_service
            .insert_purchase_order(
                &context,
                &mock_store_a().id,
                InsertPurchaseOrderInput {
                    id: "po_line_total".to_string(),
                    supplier_id: mock_name_a().id.to_string(),
                },
            )
            .unwrap();

        // 100 units at pack size 10 = 10 packs, at 6.00 after discount = 60.00
        service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "po_line_total_1".to_string(),
                    purchase_order_id: "po_line_total".to_string(),
                    item_id_or_code: mock_item_a().id.to_string(),
                    requested_pack_size: Some(10.0),
                    requested_number_of_units: Some(100.0),
                    price_per_pack_before_discount: Some(8.0),
                    price_per_pack_after_discount: Some(6.0),
                    ..Default::default()
                },
            )
            .unwrap();

        // A pack size of zero contributes nothing, whatever the quantity or price
        service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "po_line_total_2".to_string(),
                    purchase_order_id: "po_line_total".to_string(),
                    item_id_or_code: mock_item_b().id.to_string(),
                    requested_pack_size: Some(0.0),
                    requested_number_of_units: Some(50.0),
                    price_per_pack_after_discount: Some(5.0),
                    ..Default::default()
                },
            )
            .unwrap();

        let repo = PurchaseOrderLineRowRepository::new(&context.connection);
        let line_1 = repo.find_one_by_id("po_line_total_1").unwrap().unwrap();
        let line_2 = repo.find_one_by_id("po_line_total_2").unwrap().unwrap();
        assert_eq!(line_1.line_total, 60.0);
        assert_eq!(line_2.line_total, 0.0);
    }

    /// A service line keeps its full price: no line discount, no supplier discount.
    #[actix_rt::test]
    async fn insert_purchase_order_service_line_takes_no_discount() {
        use repository::{
            EqualFilter, PurchaseOrderFilter, PurchaseOrderRepository, PurchaseOrderRowRepository,
            mock::mock_item_service_item,
        };

        let (_, _, connection_manager, _) = setup_all(
            "insert_purchase_order_service_line_takes_no_discount",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.purchase_order_line_service;

        service_provider
            .purchase_order_service
            .insert_purchase_order(
                &context,
                &mock_store_a().id,
                InsertPurchaseOrderInput {
                    id: "po_service".to_string(),
                    supplier_id: mock_name_a().id.to_string(),
                },
            )
            .unwrap();

        // 10 packs at 6.00 = 60.00
        service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "po_service_stock".to_string(),
                    purchase_order_id: "po_service".to_string(),
                    item_id_or_code: mock_item_a().id.to_string(),
                    requested_pack_size: Some(10.0),
                    requested_number_of_units: Some(100.0),
                    price_per_pack_before_discount: Some(6.0),
                    price_per_pack_after_discount: Some(6.0),
                    ..Default::default()
                },
            )
            .unwrap();

        // Freight at 25.00, sent with a line discount the server drops
        service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "po_service_freight".to_string(),
                    purchase_order_id: "po_service".to_string(),
                    item_id_or_code: mock_item_service_item().id.to_string(),
                    requested_pack_size: Some(1.0),
                    requested_number_of_units: Some(1.0),
                    price_per_pack_before_discount: Some(25.0),
                    price_per_pack_after_discount: Some(20.0),
                    ..Default::default()
                },
            )
            .unwrap();

        let freight = PurchaseOrderLineRowRepository::new(&context.connection)
            .find_one_by_id("po_service_freight")
            .unwrap()
            .unwrap();
        assert_eq!(freight.price_per_pack_after_discount, 25.0);
        assert_eq!(freight.line_total, 25.0);

        let order_repo = PurchaseOrderRowRepository::new(&context.connection);
        let mut order = order_repo.find_one_by_id("po_service").unwrap().unwrap();
        order.supplier_discount_percentage = Some(10.0);
        order_repo.upsert_one(&order).unwrap();

        // 10% off the 60.00 of stock only: 85.00 − 6.00
        let stats = PurchaseOrderRepository::new(&context.connection)
            .query_by_filter(
                PurchaseOrderFilter::new().id(EqualFilter::equal_to("po_service".to_string())),
            )
            .unwrap()
            .pop()
            .unwrap()
            .purchase_order_stats_row
            .unwrap();
        assert_eq!(stats.order_total_before_discount, 85.0);
        assert_eq!(stats.supplier_discountable_total, 60.0);
        assert_eq!(stats.order_total_after_discount, 79.0);
    }
}
