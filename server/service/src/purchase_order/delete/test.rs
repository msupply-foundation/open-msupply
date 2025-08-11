#[cfg(test)]
mod delete {
    use repository::{
        mock::{mock_store_a, mock_user_account_a, MockDataInserts},
        test_db::setup_all,
    };

    use crate::{
        purchase_order::{delete::DeletePurchaseOrderError, insert::InsertPurchaseOrderInput},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_purchase_order_errors() {
        let (_, _, connection_manager, _) =
            setup_all("delete_purchase_order_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // PurchaseOrderDoesNotExist
        assert_eq!(
            service_provider
                .purchase_order_service
                .delete_purchase_order(&context, "invalid_id".to_string()),
            Err(DeletePurchaseOrderError::PurchaseOrderDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn delete_purchase_order_success() {
        let (_, _, connection_manager, _) =
            setup_all("delete_purchase_order_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // Create a purchase order first
        let purchase_order = service_provider
            .purchase_order_service
            .insert_purchase_order(
                &context,
                &mock_store_a().id,
                InsertPurchaseOrderInput {
                    id: "test_purchase_order_delete".to_string(),
                    supplier_id: "name_a".to_string(), // Using mock data
                },
            )
            .unwrap();

        // Delete the purchase order
        let result = service_provider
            .purchase_order_service
            .delete_purchase_order(&context, purchase_order.id.clone())
            .unwrap();

        assert_eq!(result, purchase_order.id);
    }
}
