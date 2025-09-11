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

    use crate::preference::{upsert_helpers::upsert_global, AuthorisePurchaseOrder, Preference};
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

        // AuthorisePurchaseOrder
        //     .upsert(&context.connection, true, Some(store_id.to_string()))
        //     .unwrap();

        // add preference to allow authorised purchase orders
        upsert_global(
            &context.connection,
            AuthorisePurchaseOrder.key_str(),
            "true".to_string(),
        )
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

        // add preference to allow authorised purchase orders
        upsert_global(
            &context.connection,
            AuthorisePurchaseOrder.key_str(),
            "true".to_string(),
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
                    status: Some(PurchaseOrderStatus::RequestApproval),
                    received_at_port_date: Some(NullableUpdate {
                        value: Some(NaiveDate::from_ymd_opt(2023, 10, 1).unwrap()),
                    }),
                    ..Default::default()
                },
                None,
            )
            .unwrap();

        let purchase_order = PurchaseOrderRowRepository::new(&context.connection)
            .find_one_by_id(&purchase_order_id.clone())
            .unwrap()
            .unwrap();

        assert_eq!(result.id, purchase_order.id);
        assert_eq!(
            result.supplier_discount_percentage,
            Some(discount_percentage)
        );
        assert_eq!(result.comment, Some("Updated comment".to_string()));
        assert_eq!(result.status, PurchaseOrderStatus::RequestApproval);
        assert_eq!(
            result.received_at_port_date,
            Some(NaiveDate::from_ymd_opt(2023, 10, 1).unwrap())
        );

        // test activity log for created then updated status to authorised
        let logs = ActivityLogRowRepository::new(&context.connection)
            .find_many_by_record_id(&purchase_order_id.clone())
            .unwrap();

        assert_eq!(logs.len(), 2);

        let log = logs
            .clone()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::PurchaseOrderRequestApproval)
            .unwrap();

        assert_eq!(log.r#type, ActivityLogType::PurchaseOrderRequestApproval);

        let request_approval_logs: Vec<_> = logs
            .into_iter()
            .filter(|l| l.r#type == ActivityLogType::PurchaseOrderRequestApproval)
            .collect();

        assert_eq!(request_approval_logs.len(), 1);

        // set purchase order to confirmed
        // user has permission to authorise
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

        let log = ActivityLogRowRepository::new(&context.connection)
            .find_many_by_record_id(&purchase_order_id.clone())
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::PurchaseOrderConfirmed)
            .unwrap();

        assert_eq!(log.r#type, ActivityLogType::PurchaseOrderConfirmed);

        // Set purchase order to finalised

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

        let log = ActivityLogRowRepository::new(&context.connection)
            .find_many_by_record_id(&purchase_order_id.clone())
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::PurchaseOrderFinalised)
            .unwrap();

        assert_eq!(log.r#type, ActivityLogType::PurchaseOrderFinalised);
    }
}
