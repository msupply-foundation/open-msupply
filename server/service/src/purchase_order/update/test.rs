#[cfg(test)]
mod update {
    use chrono::NaiveDate;
    use repository::{
        mock::{
            mock_name_a, mock_name_store_b, mock_store_a, mock_user_account_a, MockDataInserts,
        },
        test_db::setup_all,
        ActivityLogRowRepository, ActivityLogType, PreferenceRow, PreferenceRowRepository,
        PurchaseOrderRowRepository, PurchaseOrderStatus,
    };

    use crate::preference::{AuthorisePurchaseOrder, Preference};
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

        let purchase_order_id = "purchase_order_id".to_string();

        service
            .insert_purchase_order(
                &context,
                &mock_store_a().id,
                InsertPurchaseOrderInput {
                    id: purchase_order_id.clone(),
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
                    id: purchase_order_id.clone(),
                    supplier_id: Some("non_existent_supplier".to_string()),
                    ..Default::default()
                },
                None
            ),
            Err(UpdatePurchaseOrderError::SupplierDoesNotExist)
        );

        // NotASupplier
        assert_eq!(
            service.update_purchase_order(
                &context,
                store_id,
                UpdatePurchaseOrderInput {
                    id: purchase_order_id.clone(),
                    supplier_id: Some(mock_name_store_b().id.to_string()),
                    ..Default::default()
                },
                None
            ),
            Err(UpdatePurchaseOrderError::NotASupplier)
        );

        // DonorDoesNotExist
        assert_eq!(
            service.update_purchase_order(
                &context,
                store_id,
                UpdatePurchaseOrderInput {
                    id: purchase_order_id.clone(),
                    donor_id: Some(NullableUpdate {
                        value: Some("non_existent_donor".to_string())
                    }),
                    ..Default::default()
                },
                None
            ),
            Err(UpdatePurchaseOrderError::DonorDoesNotExist)
        );

        // UserUnableToAuthorisePurchaseOrder
        // Add preference to require authorisation on purchase orders
        PreferenceRowRepository::new(&context.connection)
            .upsert_one(&PreferenceRow {
                id: "authorise_purchase_order_pref".to_string(),
                key: AuthorisePurchaseOrder.key().to_string(),
                value: "true".to_string(),
                store_id: None, // Global pref so needs store: None
            })
            .unwrap();

        assert_eq!(
            service.update_purchase_order(
                &context,
                store_id,
                UpdatePurchaseOrderInput {
                    id: "purchase_order_id".to_string(),
                    status: Some(PurchaseOrderStatus::Confirmed),
                    ..Default::default()
                },
                Some(false)
            ),
            Err(UpdatePurchaseOrderError::UserUnableToAuthorisePurchaseOrder)
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
        let purchase_order_id = "purchase_order_id".to_string();

        // Create a purchase order row with a valid supplier
        service
            .insert_purchase_order(
                &context,
                store_id,
                InsertPurchaseOrderInput {
                    id: purchase_order_id.clone(),
                    supplier_id: mock_name_a().id.to_string(),
                },
            )
            .unwrap();

        let purchase_order = PurchaseOrderRowRepository::new(&context.connection)
            .find_one_by_id(&purchase_order_id.clone())
            .unwrap()
            .unwrap();

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
                    id: purchase_order_id.clone(),
                    supplier_discount_percentage: Some(discount_percentage),
                    comment: Some("Updated comment".to_string()),
                    status: Some(PurchaseOrderStatus::New),
                    received_at_port_date: Some(NullableUpdate {
                        value: Some(NaiveDate::from_ymd_opt(2023, 10, 1).unwrap()),
                    }),
                    ..Default::default()
                },
                None,
            )
            .unwrap();

        assert_eq!(
            result.supplier_discount_percentage,
            Some(discount_percentage)
        );
        assert_eq!(result.comment, Some("Updated comment".to_string()));
        assert_eq!(result.status, PurchaseOrderStatus::New);
        assert_eq!(
            result.received_at_port_date,
            Some(NaiveDate::from_ymd_opt(2023, 10, 1).unwrap())
        );

        // set purchase order to confirmed
        // purchase order authorisation is off
        service
            .update_purchase_order(
                &context,
                store_id,
                UpdatePurchaseOrderInput {
                    id: purchase_order_id.clone(),
                    status: Some(PurchaseOrderStatus::Confirmed),
                    ..Default::default()
                },
                Some(false),
            )
            .unwrap();
    }

    #[actix_rt::test]
    async fn update_purchase_order_statuses_with_authorisation() {
        let (_, _, connection_manager, _) = setup_all(
            "update_purchase_order_success_with_authorisation",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.purchase_order_service;

        let store_id = &mock_store_a().id;
        let purchase_order_id = "purchase_order_id_with_auth".to_string();

        // Add preference to require authorisation on purchase orders
        PreferenceRowRepository::new(&context.connection)
            .upsert_one(&PreferenceRow {
                id: "authorise_purchase_order_pref".to_string(),
                key: AuthorisePurchaseOrder.key().to_string(),
                value: "true".to_string(),
                store_id: None, // Global pref so needs store: None
            })
            .unwrap();

        // NEW ORDER
        // Create a purchase order row with a valid supplier
        service
            .insert_purchase_order(
                &context,
                store_id,
                InsertPurchaseOrderInput {
                    id: purchase_order_id.clone(),
                    supplier_id: mock_name_a().id.to_string(),
                },
            )
            .unwrap();

        let purchase_order = PurchaseOrderRowRepository::new(&context.connection)
            .find_one_by_id(&purchase_order_id.clone())
            .unwrap()
            .unwrap();

        PurchaseOrderRowRepository::new(&context.connection)
            .upsert_one(&purchase_order)
            .unwrap();

        assert_eq!(purchase_order.status, PurchaseOrderStatus::New);

        // Test activity log created
        let new_purchase_order_logs: Vec<_> = ActivityLogRowRepository::new(&context.connection)
            .find_many_by_record_id(&purchase_order_id.clone())
            .unwrap()
            .into_iter()
            .filter(|l| l.r#type == ActivityLogType::PurchaseOrderCreated)
            .collect();

        assert_eq!(new_purchase_order_logs.len(), 1);
        assert_eq!(
            new_purchase_order_logs[0].r#type,
            ActivityLogType::PurchaseOrderCreated
        );

        // Update purchase order status to Request Approval
        service
            .update_purchase_order(
                &context,
                store_id,
                UpdatePurchaseOrderInput {
                    id: purchase_order_id.clone(),
                    status: Some(PurchaseOrderStatus::RequestApproval),
                    ..Default::default()
                },
                None,
            )
            .unwrap();

        // Test activity log created
        let request_approval_logs: Vec<_> = ActivityLogRowRepository::new(&context.connection)
            .find_many_by_record_id(&purchase_order_id.clone())
            .unwrap()
            .into_iter()
            .filter(|l| l.r#type == ActivityLogType::PurchaseOrderRequestApproval)
            .collect();

        assert_eq!(request_approval_logs.len(), 1);
        assert_eq!(
            request_approval_logs[0].r#type,
            ActivityLogType::PurchaseOrderRequestApproval
        );

        // Update purchase order status to Confirmed
        // User has permission to authorise
        service
            .update_purchase_order(
                &context,
                store_id,
                UpdatePurchaseOrderInput {
                    id: purchase_order_id.clone(),
                    status: Some(PurchaseOrderStatus::Confirmed),
                    ..Default::default()
                },
                Some(true),
            )
            .unwrap();

        // Test activity log created
        let confirmed_logs: Vec<_> = ActivityLogRowRepository::new(&context.connection)
            .find_many_by_record_id(&purchase_order_id.clone())
            .unwrap()
            .into_iter()
            .filter(|l| l.r#type == ActivityLogType::PurchaseOrderConfirmed)
            .collect();

        assert_eq!(confirmed_logs.len(), 1);
        assert_eq!(
            confirmed_logs[0].r#type,
            ActivityLogType::PurchaseOrderConfirmed
        );

        // Update purchase order to sent
        service
            .update_purchase_order(
                &context,
                store_id,
                UpdatePurchaseOrderInput {
                    id: purchase_order_id.clone(),
                    status: Some(PurchaseOrderStatus::Sent),
                    ..Default::default()
                },
                None,
            )
            .unwrap();

        // Test activity log created
        let sent_logs: Vec<_> = ActivityLogRowRepository::new(&context.connection)
            .find_many_by_record_id(&purchase_order_id.clone())
            .unwrap()
            .into_iter()
            .filter(|l| l.r#type == ActivityLogType::PurchaseOrderSent)
            .collect();

        assert_eq!(sent_logs.len(), 1);
        assert_eq!(sent_logs[0].r#type, ActivityLogType::PurchaseOrderSent);

        // Update purchase order to finalised
        service
            .update_purchase_order(
                &context,
                store_id,
                UpdatePurchaseOrderInput {
                    id: purchase_order_id.clone(),
                    status: Some(PurchaseOrderStatus::Finalised),
                    ..Default::default()
                },
                None,
            )
            .unwrap();

        // Test activity log created
        let finalised_logs: Vec<_> = ActivityLogRowRepository::new(&context.connection)
            .find_many_by_record_id(&purchase_order_id.clone())
            .unwrap()
            .into_iter()
            .filter(|l| l.r#type == ActivityLogType::PurchaseOrderFinalised)
            .collect();

        assert_eq!(finalised_logs.len(), 1);
        assert_eq!(
            finalised_logs[0].r#type,
            ActivityLogType::PurchaseOrderFinalised
        );

        // Total logs at end:
        let total_logs = ActivityLogRowRepository::new(&context.connection)
            .find_many_by_record_id(&purchase_order_id.clone())
            .unwrap();

        assert_eq!(total_logs.len(), 5);
    }
}
