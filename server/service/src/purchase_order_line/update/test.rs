#[cfg(test)]
mod update {
    use repository::{
        mock::{mock_item_a, mock_item_b, mock_store_a, MockDataInserts},
        test_db::setup_all,
        ActivityLogRowRepository, ActivityLogType,
    };

    use crate::{
        purchase_order_line::{
            insert::InsertPurchaseOrderLineInput,
            update::{UpdatePurchaseOrderLineInput, UpdatePurchaseOrderLineInputError},
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn update_purchase_order_line_errors() {
        let (_, _, connection_manager, _) =
            setup_all("update_purchase_order_line_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.purchase_order_line_service;

        // Create a purchase order line
        service
            .insert_purchase_order_line(
                &context,
                &mock_store_a().id,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id_1".to_string(),
                    purchase_order_id: "test_purchase_order_a".to_string(),
                    item_id: mock_item_a().id.to_string(),
                },
            )
            .unwrap();

        // PurchaseOrderLineNotFound
        assert_eq!(
            service.update_purchase_order_line(
                &context,
                &mock_store_a().id,
                UpdatePurchaseOrderLineInput {
                    id: "non_existent_line_id".to_string(),
                    item_id: None,
                    requested_pack_size: Some(10.0),
                    requested_number_of_units: Some(5.0),
                    requested_delivery_date: None,
                    expected_delivery_date: None,
                }
            ),
            Err(UpdatePurchaseOrderLineInputError::PurchaseOrderLineNotFound)
        );
    }

    #[actix_rt::test]
    async fn update_purchase_order_line_success() {
        let (_, _, connection_manager, _) =
            setup_all("update_purchase_order_line_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.purchase_order_line_service;

        // Create a purchase order line
        service
            .insert_purchase_order_line(
                &context,
                &mock_store_a().id,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id_1".to_string(),
                    purchase_order_id: "test_purchase_order_a".to_string(),
                    item_id: mock_item_a().id.to_string(),
                },
            )
            .unwrap();

        // Update the purchase order line
        let result = service
            .update_purchase_order_line(
                &context,
                &mock_store_a().id,
                UpdatePurchaseOrderLineInput {
                    id: "purchase_order_line_id_1".to_string(),
                    item_id: Some(mock_item_b().id.to_string()),
                    requested_pack_size: Some(10.0),
                    requested_number_of_units: Some(5.0),
                    requested_delivery_date: None,
                    expected_delivery_date: None,
                },
            )
            .unwrap();

        assert_eq!(
            result.purchase_order_line_row.id,
            "purchase_order_line_id_1"
        );
        assert_eq!(result.item_row.id, mock_item_b().id.clone());

        let log = ActivityLogRowRepository::new(&context.connection)
            .find_many_by_record_id(&result.purchase_order_line_row.id)
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::PurchaseOrderLineUpdated)
            .unwrap();

        assert_eq!(log.r#type, ActivityLogType::PurchaseOrderLineUpdated);
    }
}
