#[cfg(test)]
mod insert {
    use repository::{
        mock::{
            mock_item_a, mock_item_b, mock_name_a, mock_store_a, mock_user_account_a,
            MockDataInserts,
        },
        test_db::setup_all,
        PurchaseOrderLineRow, PurchaseOrderLineRowRepository,
    };

    use crate::{
        purchase_order::insert::InsertPurchaseOrderInput,
        purchase_order_line::insert::{
            InsertPurchaseOrderLineError, InsertPurchaseOrderLineFromCSVInput,
            InsertPurchaseOrderLineInput, PackSizeCodeCombination,
        },
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
                    item_id: "item_id".to_string(),
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
                    item_id: "non_existent_item".to_string(),
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
                    item_id: mock_item_a().id.to_string(),
                },
            )
            .unwrap();

        assert_eq!(
            service.insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id".to_string(),
                    purchase_order_id: "purchase_order_id".to_string(),
                    item_id: mock_item_a().id.to_string(),
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
                    item_id: mock_item_a().id.to_string(),
                },
            )
            .unwrap();

        let result_1_2 = service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id_1_2".to_string(),
                    purchase_order_id: "purchase_order_id_1".to_string(),
                    item_id: mock_item_b().id.to_string(),
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
                    item_id: mock_item_a().id.to_string(),
                },
            )
            .unwrap();

        let result_2_2 = service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id_2_2".to_string(),
                    purchase_order_id: "purchase_order_id_2".to_string(),
                    item_id: mock_item_b().id.to_string(),
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
    }

    #[actix_rt::test]
    async fn insert_purchase_order_line_from_csv_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_purchase_order_line_from_csv_errors",
            MockDataInserts::all(),
        )
        .await;

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
                    item_id: "item_id".to_string(),
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

        // cannot find item by code
        assert_eq!(
            service.insert_purchase_order_line_from_csv(
                &context,
                InsertPurchaseOrderLineFromCSVInput {
                    id: "purchase_order_line_id".to_string(),
                    purchase_order_id: "purchase_order_id".to_string(),
                    item_code: "some_non_existent_item".to_string(),
                    requested_pack_size: Some(0.0),
                    requested_number_of_units: Some(0.0)
                }
            ),
            Err(InsertPurchaseOrderLineError::CannotFindItemByCode(
                "some_non_existent_item".to_string()
            ))
        );

        // successfully insert a purchase order line
        assert_eq!(
            service.insert_purchase_order_line_from_csv(
                &context,
                InsertPurchaseOrderLineFromCSVInput {
                    id: "purchase_order_line_id".to_string(),
                    purchase_order_id: "purchase_order_id".to_string(),
                    item_code: mock_item_a().code.clone(),
                    requested_pack_size: Some(1.1),
                    requested_number_of_units: Some(0.0),
                },
            ),
            Ok(PurchaseOrderLineRow {
                id: "purchase_order_line_id".to_string(),
                store_id: mock_store_a().id.clone(),
                purchase_order_id: "purchase_order_id".to_string(),
                item_link_id: mock_item_a().id.to_string(),
                requested_pack_size: 1.1,
                requested_number_of_units: 0.0,
                line_number: 1,
                ..Default::default()
            })
        );

        // Same item code and pack size combination cannot be inserted again
        assert_eq!(
            service.insert_purchase_order_line_from_csv(
                &context,
                InsertPurchaseOrderLineFromCSVInput {
                    id: "purchase_order_line_id_2".to_string(),
                    purchase_order_id: "purchase_order_id".to_string(),
                    item_code: mock_item_a().code.clone(),
                    requested_pack_size: Some(1.1),
                    requested_number_of_units: Some(0.0),
                },
            ),
            Err(InsertPurchaseOrderLineError::PackSizeCodeCombinationExists(
                PackSizeCodeCombination {
                    item_code: mock_item_a().code.clone(),
                    requested_pack_size: 1.1,
                }
            ))
        );
    }
}
