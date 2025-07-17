#[cfg(test)]
mod insert {
    use repository::{
        mock::{mock_item_a, mock_name_a, mock_store_a, mock_user_account_a, MockDataInserts},
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

        // Create a purchase order line
        let result = service
            .insert_purchase_order_line(
                &context,
                &mock_store_a().id,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id".to_string(),
                    purchase_order_id: "purchase_order_id".to_string(),
                    item_id: mock_item_a().id.to_string(),
                },
            )
            .unwrap();

        let purchase_order_line =
            repository::PurchaseOrderLineRowRepository::new(&context.connection)
                .find_one_by_id("purchase_order_line_id")
                .unwrap()
                .unwrap();

        assert_eq!(result.id, purchase_order_line.id);
    }
}
