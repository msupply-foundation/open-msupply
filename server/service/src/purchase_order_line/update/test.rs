#[cfg(test)]
mod update {
    use repository::{
        mock::{
            mock_item_a, mock_item_b, mock_item_d, mock_purchase_order_a, mock_store_a,
            MockDataInserts,
        },
        test_db::setup_all,
        ActivityLogRowRepository, ActivityLogType, PurchaseOrderLineRow,
        PurchaseOrderLineRowRepository, PurchaseOrderLineStatus,
    };

    use crate::{
        purchase_order::update::UpdatePurchaseOrderInput,
        purchase_order_line::{
            insert::{InsertPurchaseOrderLineInput, PackSizeCodeCombination},
            update::{UpdatePurchaseOrderLineInput, UpdatePurchaseOrderLineInputError},
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn update_purchase_order_line_errors() {
        let (_, _, connection_manager, _) =
            setup_all("update_purchase_order_line_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id.clone(), "".to_string())
            .unwrap();
        let service = service_provider.purchase_order_line_service;
        let purchase_order_service = service_provider.purchase_order_service;
        let mut user_permission = true;

        // Create a purchase order line
        service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id_1".to_string(),
                    purchase_order_id: mock_purchase_order_a().id.to_string(),
                    item_id: mock_item_a().id.to_string(),
                    requested_pack_size: Some(2.0),
                    ..Default::default()
                },
            )
            .unwrap();

        // PurchaseOrderLineNotFound
        assert_eq!(
            service.update_purchase_order_line(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderLineInput {
                    id: "non_existent_line_id".to_string(),
                    item_id: None,
                    requested_pack_size: Some(10.0),
                    requested_number_of_units: Some(5.0),

                    ..Default::default()
                },
                None
            ),
            Err(UpdatePurchaseOrderLineInputError::PurchaseOrderLineNotFound)
        );

        // Cannot update to the same item and pack size combination

        // add another existing line with same pack size and item
        service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id_2".to_string(),
                    purchase_order_id: "test_purchase_order_a".to_string(),
                    item_id: mock_item_a().id.to_string(),
                    requested_pack_size: Some(5.0),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(
            service.update_purchase_order_line(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderLineInput {
                    id: "purchase_order_line_id_1".to_string(),
                    item_id: Some(mock_item_a().id.to_string()),
                    requested_pack_size: Some(5.0),
                    ..Default::default()
                },
                None
            ),
            Err(
                UpdatePurchaseOrderLineInputError::PackSizeCodeCombinationExists(
                    PackSizeCodeCombination {
                        item_code: mock_item_a().code.clone(),
                        requested_pack_size: 5.0,
                    }
                )
            )
        );

        // CannotChangeStatus - to sent from a new purchase order
        assert_eq!(
            service.update_purchase_order_line(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderLineInput {
                    id: "purchase_order_line_id_1".to_string(),
                    item_id: Some(mock_item_a().id.to_string()),
                    status: Some(PurchaseOrderLineStatus::Sent),
                    ..Default::default()
                },
                None
            ),
            Err(UpdatePurchaseOrderLineInputError::CannotChangeStatus)
        );

        // CannotChangeStatus - to new from a confirmed purchase order
        purchase_order_service
            .update_purchase_order(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderInput {
                    id: "test_purchase_order_a".to_string(),
                    status: Some(repository::PurchaseOrderStatus::Confirmed),
                    ..Default::default()
                },
                Some(user_permission),
            )
            .unwrap();

        assert_eq!(
            service.update_purchase_order_line(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderLineInput {
                    id: "purchase_order_line_id_1".to_string(),
                    item_id: Some(mock_item_a().id.to_string()),
                    status: Some(PurchaseOrderLineStatus::New),
                    ..Default::default()
                },
                None
            ),
            Err(UpdatePurchaseOrderLineInputError::CannotChangeStatus)
        );

        // Cannot change requested quantity on a confirmed purchase order
        assert_eq!(
            service.update_purchase_order_line(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderLineInput {
                    id: "purchase_order_line_id_1".to_string(),
                    item_id: Some(mock_item_a().id.to_string()),
                    requested_number_of_units: Some(5.0),
                    ..Default::default()
                },
                None
            ),
            Err(UpdatePurchaseOrderLineInputError::CannotEditRequestedQuantity)
        );

        // Cannot change adjusted quantity if the user does not have permission
        user_permission = false;

        assert_eq!(
            service.update_purchase_order_line(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderLineInput {
                    id: "purchase_order_line_id_1".to_string(),
                    item_id: Some(mock_item_a().id.to_string()),
                    adjusted_number_of_units: Some(5.0),
                    ..Default::default()
                },
                Some(user_permission)
            ),
            Err(UpdatePurchaseOrderLineInputError::CannotEditAdjustedQuantity)
        );

        // Cannot change adjusted quantity to less than received quantity
        user_permission = true;

        let line = PurchaseOrderLineRow {
            id: "purchase_order_line_received".to_string(),
            purchase_order_id: mock_purchase_order_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            line_number: 2,
            item_link_id: mock_item_b().id,
            requested_pack_size: 2.0,
            requested_number_of_units: 10.0,
            adjusted_number_of_units: Some(20.0),
            received_number_of_units: 15.0,
            ..Default::default()
        };

        PurchaseOrderLineRowRepository::new(&context.connection)
            .upsert_one(&line)
            .unwrap();

        assert_eq!(
            service.update_purchase_order_line(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderLineInput {
                    id: "purchase_order_line_received".to_string(),
                    item_id: Some(mock_item_b().id.to_string()),
                    adjusted_number_of_units: Some(14.0),
                    ..Default::default()
                },
                Some(user_permission)
            ),
            Err(UpdatePurchaseOrderLineInputError::CannotEditQuantityBelowReceived)
        );

        // Cannot change adjusted quantity on a finalised purchase order, even if the user has permission
        purchase_order_service
            .update_purchase_order(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderInput {
                    id: "test_purchase_order_a".to_string(),
                    status: Some(repository::PurchaseOrderStatus::Finalised),
                    ..Default::default()
                },
                None,
            )
            .unwrap();

        assert_eq!(
            service.update_purchase_order_line(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderLineInput {
                    id: "purchase_order_line_id_1".to_string(),
                    item_id: Some(mock_item_a().id.to_string()),
                    adjusted_number_of_units: Some(5.0),
                    ..Default::default()
                },
                Some(user_permission)
            ),
            Err(UpdatePurchaseOrderLineInputError::CannotEditAdjustedQuantity)
        );
    }

    #[actix_rt::test]
    async fn update_purchase_order_line_success() {
        let (_, _, connection_manager, _) =
            setup_all("update_purchase_order_line_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id.clone(), "".to_string())
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
                    requested_pack_size: Some(5.0),
                    ..Default::default()
                },
            )
            .unwrap();

        // Update the purchase order line
        let result = service
            .update_purchase_order_line(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderLineInput {
                    id: "purchase_order_line_id_1".to_string(),
                    item_id: Some(mock_item_d().id.to_string()),
                    requested_pack_size: Some(10.0),
                    requested_number_of_units: Some(5.0),
                    ..Default::default()
                },
                None,
            )
            .unwrap();

        assert_eq!(
            result.purchase_order_line_row.id,
            "purchase_order_line_id_1"
        );
        assert_eq!(result.item_row.id, mock_item_d().id.clone());

        let log = ActivityLogRowRepository::new(&context.connection)
            .find_many_by_record_id(&result.purchase_order_line_row.purchase_order_id)
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::PurchaseOrderLineUpdated)
            .unwrap();

        assert_eq!(log.r#type, ActivityLogType::PurchaseOrderLineUpdated);
    }
}
