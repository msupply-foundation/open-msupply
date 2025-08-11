#[cfg(test)]
mod delete {
    use repository::{
        mock::{
            mock_item_a, mock_item_c, mock_purchase_order_a, mock_purchase_order_b_line_1,
            mock_store_a, mock_user_account_a, MockDataInserts,
        },
        test_db::setup_all,
    };

    use crate::{
        purchase_order_line::{
            delete::DeletePurchaseOrderLineError, insert::InsertPurchaseOrderLineInput,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_purchase_order_line_errors() {
        let (_, _, connection_manager, _) =
            setup_all("delete_purchase_order_line_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // PurchaseOrderLineNotFound
        assert_eq!(
            service_provider
                .purchase_order_line_service
                .delete_purchase_order_line(&context, "purchase_order_line_id_1".to_string()),
            Err(DeletePurchaseOrderLineError::PurchaseOrderLineDoesNotExist)
        );

        // try to delete a line from a purchase order that is not editable
        let result = service_provider
            .purchase_order_line_service
            .delete_purchase_order_line(&context, mock_purchase_order_b_line_1().id);
        assert_eq!(
            result,
            Err(DeletePurchaseOrderLineError::CannotEditPurchaseOrder)
        );
    }

    #[actix_rt::test]
    async fn delete_purchase_order_line_success() {
        let (_, _, connection_manager, _) =
            setup_all("delete_purchase_order_line_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "user_id".to_string())
            .unwrap();
        let service = service_provider.purchase_order_line_service;

        // Create a purchase order line
        service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id_1".to_string(),
                    purchase_order_id: "test_purchase_order_a".to_string(),
                    item_id: mock_item_a().id.to_string(),
                    ..Default::default()
                },
            )
            .unwrap();

        let id = service
            .delete_purchase_order_line(&context, "purchase_order_line_id_1".to_string())
            .unwrap();

        assert_eq!(id, "purchase_order_line_id_1");
    }
}
