#[cfg(test)]
mod insert {
    use repository::{
        mock::{mock_item_a, mock_name_a, mock_store_a, mock_user_account_a, MockDataInserts},
        test_db::setup_all,
        PurchaseOrderLineRowRepository,
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

        let store_id = &mock_store_a().id;

        // Purchase Order Does Not Exist
        assert_eq!(
            service.insert_purchase_order_line(
                &context,
                store_id,
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
                store_id,
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
                store_id,
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
                store_id,
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
                &mock_store_a().id,
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
                &mock_store_a().id,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id_1_2".to_string(),
                    purchase_order_id: "purchase_order_id_1".to_string(),
                    item_id: mock_item_a().id.to_string(),
                },
            )
            .unwrap();

        // Create purchase order lines for purchase_order_id_2
        let result_2_1 = service
            .insert_purchase_order_line(
                &context,
                &mock_store_a().id,
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
                &mock_store_a().id,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id_2_2".to_string(),
                    purchase_order_id: "purchase_order_id_2".to_string(),
                    item_id: mock_item_a().id.to_string(),
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
        assert_eq!(purchase_order_lines_1_1.line_number, Some(1));
        assert_eq!(purchase_order_lines_1_2.line_number, Some(2));

        // Assert that the line numbers are set correctly for purchase order id 2
        assert_eq!(purchase_order_lines_2_1.line_number, Some(1));
        assert_eq!(purchase_order_lines_2_2.line_number, Some(2));

        // Assert that the results match the expected IDs
        assert_eq!(result_1_1.id, purchase_order_lines_1_1.id);
        assert_eq!(result_1_2.id, purchase_order_lines_1_2.id);
        assert_eq!(result_2_1.id, purchase_order_lines_2_1.id);
        assert_eq!(result_2_2.id, purchase_order_lines_2_2.id);
    }

    // Don't really need to test concurrent inserts in this case, as the line number is auto-incremented by the next_number method.
    // #[actix_rt::test]
    // async fn insert_purchase_order_line_concurrent_threads() {
    //     let (_, _, connection_manager, _) = setup_all(
    //         "insert_purchase_order_line_concurrent_threads",
    //         MockDataInserts::all(),
    //     )
    //     .await;

    //     let service_provider = ServiceProvider::new(connection_manager.clone());
    //     let context = service_provider
    //         .context(mock_store_a().id, mock_user_account_a().id)
    //         .unwrap();

    //     service_provider
    //         .purchase_order_service
    //         .insert_purchase_order(
    //             &context,
    //             &mock_store_a().id,
    //             InsertPurchaseOrderInput {
    //                 id: "purchase_order_id".to_string(),
    //                 supplier_id: mock_name_a().id.to_string(),
    //             },
    //         )
    //         .unwrap();

    //     let mut handles = vec![];
    //     for i in 1..=4 {
    //         let connection_manager = connection_manager.clone();
    //         let store_id = mock_store_a().id.clone();
    //         let item_id = mock_item_a().id.clone();
    //         let purchase_order_id = "purchase_order_id".to_string();
    //         let line_id = format!("purchase_order_line_id_{}", i);

    //         let handle = std::thread::spawn(move || {
    //             let service_provider = ServiceProvider::new(connection_manager);
    //             let context = service_provider
    //                 .context(store_id.clone(), mock_user_account_a().id)
    //                 .unwrap();
    //             let service = service_provider.purchase_order_line_service;

    //             service
    //                 .insert_purchase_order_line(
    //                     &context,
    //                     &store_id,
    //                     InsertPurchaseOrderLineInput {
    //                         id: line_id,
    //                         purchase_order_id,
    //                         item_id,
    //                     },
    //                 )
    //                 .unwrap()
    //         });
    //         handles.push(handle);
    //     }

    //     let mut line_numbers = vec![];
    //     for handle in handles {
    //         let result = handle.join().unwrap();
    //         println!("Inserted line: {:?}", result);
    //         let repo = PurchaseOrderLineRowRepository::new(&context.connection);
    //         let line = repo.find_one_by_id(&result.id).unwrap().unwrap();
    //         line_numbers.push(line.line_number);
    //         assert_eq!(result.id, line.id);
    //     }

    //     line_numbers.sort();
    //     assert_eq!(line_numbers, vec![Some(1), Some(2), Some(3), Some(4)]);
    // }
}
