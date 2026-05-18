#[cfg(test)]
mod insert {
    use repository::{
        mock::{
            mock_name_a, mock_name_store_b, mock_store_a, mock_user_account_a, MockDataInserts,
        },
        test_db::setup_all,
        ActivityLogRowRepository, ActivityLogType, PurchaseOrderRow, PurchaseOrderRowRepository,
        PurchaseOrderStatus,
    };

    use crate::{
        purchase_order::insert::{InsertPurchaseOrderError, InsertPurchaseOrderInput},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn insert_purchase_order_errors() {
        let (_, _, connection_manager, _) =
            setup_all("insert_purchase_order_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.purchase_order_service;

        let store_id = &mock_store_a().id;

        // SupplierDoesNotExist
        assert_eq!(
            service.insert_purchase_order(
                &context,
                store_id,
                InsertPurchaseOrderInput {
                    id: "purchase_order_id".to_string(),
                    supplier_id: "non_existent_supplier".to_string(),
                }
            ),
            Err(InsertPurchaseOrderError::SupplierDoesNotExist)
        );

        // Create a purchase order row with a valid supplier
        PurchaseOrderRowRepository::new(&context.connection)
            .upsert_one(&PurchaseOrderRow {
                id: "purchase_order_id".to_string(),
                store_id: store_id.to_string(),
                created_by: Some(mock_user_account_a().id.clone()),
                supplier_name_id: mock_name_a().id,
                status: PurchaseOrderStatus::New,
                ..Default::default()
            })
            .unwrap();

        // PurchaseOrderAlready Exists
        assert_eq!(
            service.insert_purchase_order(
                &context,
                store_id,
                InsertPurchaseOrderInput {
                    id: "purchase_order_id".to_string(),
                    supplier_id: mock_name_a().id,
                }
            ),
            Err(InsertPurchaseOrderError::PurchaseOrderAlreadyExists)
        );

        // NotASupplier
        assert_eq!(
            service.insert_purchase_order(
                &context,
                store_id,
                InsertPurchaseOrderInput {
                    id: "purchase_order_id_a".to_string(),
                    supplier_id: mock_name_store_b().id,
                }
            ),
            Err(InsertPurchaseOrderError::NotASupplier)
        );
    }

    #[actix_rt::test]
    async fn insert_purchase_order_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_purchase_order_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.purchase_order_service;

        let result = service
            .insert_purchase_order(
                &context,
                &mock_store_a().id,
                InsertPurchaseOrderInput {
                    id: "purchase_order_id".to_string(),
                    supplier_id: mock_name_a().id.to_string(),
                },
            )
            .unwrap();

        let purchase_order = PurchaseOrderRowRepository::new(&context.connection)
            .find_one_by_id("purchase_order_id")
            .unwrap()
            .unwrap();

        assert_eq!(result.id, purchase_order.id);

        // Check logging of insertion
        let logs = ActivityLogRowRepository::new(&context.connection)
            .find_many_by_record_id("purchase_order_id")
            .unwrap();
        let log = logs.first().unwrap();

        assert_eq!(log.r#type, ActivityLogType::PurchaseOrderCreated);
    }
}
