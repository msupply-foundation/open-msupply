#[cfg(test)]
mod update {
    use chrono::NaiveDate;
    use repository::{
        mock::{
            mock_name_a, mock_name_store_b, mock_store_a, mock_user_account_a, MockDataInserts,
        },
        test_db::setup_all,
        ActivityLogRowRepository, ActivityLogType, PurchaseOrderRowRepository, PurchaseOrderStatus,
    };

    use crate::{
        purchase_order::{
            insert::InsertPurchaseOrderInput,
            update::{UpdatePurchaseOrderError, UpdatePurchaseOrderInput},
        },
        service_provider::ServiceProvider,
        NullableUpdate,
    };

    #[actix_rt::test]
    async fn update_purchase_order_errors() {
        let (_, _, connection_manager, _) =
            setup_all("update_purchase_order_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.purchase_order_service;

        let store_id = &mock_store_a().id;

        service
            .insert_purchase_order(
                &context,
                &mock_store_a().id,
                InsertPurchaseOrderInput {
                    id: "purchase_order_id".to_string(),
                    supplier_id: mock_name_a().id.to_string(),
                },
            )
            .unwrap();

        // SupplierDoesNotExist
        assert_eq!(
            service.update_purchase_order(
                &context,
                store_id,
                UpdatePurchaseOrderInput {
                    id: "purchase_order_id".to_string(),
                    supplier_id: Some("non_existent_supplier".to_string()),
                    ..Default::default()
                }
            ),
            Err(UpdatePurchaseOrderError::SupplierDoesNotExist)
        );

        // NotASupplier
        assert_eq!(
            service.update_purchase_order(
                &context,
                store_id,
                UpdatePurchaseOrderInput {
                    id: "purchase_order_id".to_string(),
                    supplier_id: Some(mock_name_store_b().id.to_string()),
                    ..Default::default()
                }
            ),
            Err(UpdatePurchaseOrderError::NotASupplier)
        );

        // DonorDoesNotExist
        assert_eq!(
            service.update_purchase_order(
                &context,
                store_id,
                UpdatePurchaseOrderInput {
                    id: "purchase_order_id".to_string(),
                    donor_id: Some(NullableUpdate {
                        value: Some("non_existent_donor".to_string())
                    }),
                    ..Default::default()
                }
            ),
            Err(UpdatePurchaseOrderError::DonorDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn update_purchase_order_success() {
        let (_, _, connection_manager, _) =
            setup_all("update_purchase_order_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.purchase_order_service;

        let store_id = &mock_store_a().id;

        // Create a purchase order row with a valid supplier
        service
            .insert_purchase_order(
                &context,
                store_id,
                InsertPurchaseOrderInput {
                    id: "purchase_order_id".to_string(),
                    supplier_id: mock_name_a().id.to_string(),
                },
            )
            .unwrap();

        let order_total_before_discount = 1000.0;
        let mut purchase_order = PurchaseOrderRowRepository::new(&context.connection)
            .find_one_by_id("purchase_order_id")
            .unwrap()
            .unwrap();

        purchase_order.order_total_before_discount = order_total_before_discount;
        PurchaseOrderRowRepository::new(&context.connection)
            .upsert_one(&purchase_order)
            .unwrap();

        // Update the purchase order with a known discount percentage
        let discount_percentage = 10.0;
        let result = service
            .update_purchase_order(
                &context,
                store_id,
                UpdatePurchaseOrderInput {
                    id: "purchase_order_id".to_string(),
                    supplier_discount_percentage: Some(discount_percentage),
                    comment: Some("Updated comment".to_string()),
                    status: Some(PurchaseOrderStatus::Authorised),
                    received_at_port_date: Some(NullableUpdate {
                        value: Some(NaiveDate::from_ymd_opt(2023, 10, 1).unwrap()),
                    }),
                    ..Default::default()
                },
            )
            .unwrap();

        let purchase_order = PurchaseOrderRowRepository::new(&context.connection)
            .find_one_by_id("purchase_order_id")
            .unwrap()
            .unwrap();

        let expected_discount_amount = order_total_before_discount * (discount_percentage / 100.0);
        let expected_total_after_discount = order_total_before_discount - expected_discount_amount;

        assert_eq!(result.id, purchase_order.id);
        assert_eq!(
            result.supplier_discount_percentage,
            Some(discount_percentage)
        );
        assert_eq!(result.supplier_discount_amount, expected_discount_amount);
        assert_eq!(
            result.order_total_after_discount,
            expected_total_after_discount
        );
        assert_eq!(result.comment, Some("Updated comment".to_string()));
        assert_eq!(result.status, PurchaseOrderStatus::Authorised);
        assert_eq!(
            result.received_at_port_date,
            Some(NaiveDate::from_ymd_opt(2023, 10, 1).unwrap())
        );

        // test activity log for updated
        let log = ActivityLogRowRepository::new(&context.connection)
            .find_one_by_id("purchase_order_id")
            .unwrap()
            .unwrap();

        assert_eq!(log.r#type, ActivityLogType::PurchaseOrderAuthorised);

        // Set purchase order back to new status from authorised
        service
            .update_purchase_order(
                &context,
                store_id,
                UpdatePurchaseOrderInput {
                    id: "purchase_order_id".to_string(),
                    status: Some(PurchaseOrderStatus::New),
                    ..Default::default()
                },
            )
            .unwrap();
    }
}
