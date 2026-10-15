#[cfg(test)]
mod delete {
    use repository::{
        ActivityLogRowRepository, ActivityLogType, PurchaseOrderLineRowRepository,
        mock::{
            MockDataInserts, mock_item_a, mock_name_a, mock_purchase_order_b_line_1, mock_store_a,
            mock_user_account_a,
        },
        test_db::setup_all,
    };

    use crate::{
        purchase_order::insert::InsertPurchaseOrderInput,
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
                    item_id_or_code: mock_item_a().id.to_string(),
                    requested_pack_size: Some(10.0),
                    ..Default::default()
                },
            )
            .unwrap();

        let id = service
            .delete_purchase_order_line(&context, "purchase_order_line_id_1".to_string())
            .unwrap();

        assert_eq!(id, "purchase_order_line_id_1");

        // test activity log for deleted
        let log = ActivityLogRowRepository::new(&context.connection)
            .find_many_by_record_id("test_purchase_order_a")
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::PurchaseOrderLineDeleted)
            .unwrap();

        assert_eq!(log.r#type, ActivityLogType::PurchaseOrderLineDeleted);
    }

    #[actix_rt::test]
    async fn delete_purchase_order_line_renumbers_remaining_lines() {
        let (_, _, connection_manager, _) = setup_all(
            "delete_purchase_order_line_renumbers_remaining_lines",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = &service_provider.purchase_order_line_service;

        service_provider
            .purchase_order_service
            .insert_purchase_order(
                &context,
                &mock_store_a().id,
                InsertPurchaseOrderInput {
                    id: "renumber_purchase_order".to_string(),
                    supplier_id: mock_name_a().id,
                },
            )
            .unwrap();

        let insert_line = |id: &str, pack_size: f64| {
            service
                .insert_purchase_order_line(
                    &context,
                    InsertPurchaseOrderLineInput {
                        id: id.to_string(),
                        purchase_order_id: "renumber_purchase_order".to_string(),
                        item_id_or_code: mock_item_a().id,
                        requested_pack_size: Some(pack_size),
                        ..Default::default()
                    },
                )
                .unwrap()
        };
        let line_numbers = || {
            let mut lines = PurchaseOrderLineRowRepository::new(&context.connection)
                .find_many_by_purchase_order_ids(&["renumber_purchase_order".to_string()])
                .unwrap();
            lines.sort_by_key(|line| line.line_number);
            lines
                .into_iter()
                .map(|line| (line.id, line.line_number))
                .collect::<Vec<_>>()
        };

        for (index, id) in ["line_1", "line_2", "line_3", "line_4"].iter().enumerate() {
            insert_line(id, index as f64 + 1.0);
        }

        service
            .delete_purchase_order_line(&context, "line_2".to_string())
            .unwrap();
        assert_eq!(
            line_numbers(),
            vec![
                ("line_1".to_string(), 1),
                ("line_3".to_string(), 2),
                ("line_4".to_string(), 3),
            ]
        );

        assert_eq!(insert_line("line_5", 5.0).line_number, 4);

        service
            .delete_purchase_order_line(&context, "line_5".to_string())
            .unwrap();
        assert_eq!(insert_line("line_6", 6.0).line_number, 4);
        assert_eq!(
            line_numbers(),
            vec![
                ("line_1".to_string(), 1),
                ("line_3".to_string(), 2),
                ("line_4".to_string(), 3),
                ("line_6".to_string(), 4),
            ]
        );
    }

    #[actix_rt::test]
    async fn delete_purchase_order_lines_renumbers_once_per_batch() {
        let (_, _, connection_manager, _) = setup_all(
            "delete_purchase_order_lines_renumbers_once_per_batch",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = &service_provider.purchase_order_line_service;

        service_provider
            .purchase_order_service
            .insert_purchase_order(
                &context,
                &mock_store_a().id,
                InsertPurchaseOrderInput {
                    id: "batch_purchase_order".to_string(),
                    supplier_id: mock_name_a().id,
                },
            )
            .unwrap();

        let insert_line = |id: &str, pack_size: f64| {
            service
                .insert_purchase_order_line(
                    &context,
                    InsertPurchaseOrderLineInput {
                        id: id.to_string(),
                        purchase_order_id: "batch_purchase_order".to_string(),
                        item_id_or_code: mock_item_a().id,
                        requested_pack_size: Some(pack_size),
                        ..Default::default()
                    },
                )
                .unwrap()
        };
        let line_numbers = || {
            let mut lines = PurchaseOrderLineRowRepository::new(&context.connection)
                .find_many_by_purchase_order_ids(&["batch_purchase_order".to_string()])
                .unwrap();
            lines.sort_by_key(|line| line.line_number);
            lines
                .into_iter()
                .map(|line| (line.id, line.line_number))
                .collect::<Vec<_>>()
        };

        for (index, id) in ["line_1", "line_2", "line_3", "line_4", "line_5"]
            .iter()
            .enumerate()
        {
            insert_line(id, index as f64 + 1.0);
        }

        // Lines 1 and 3 go, a missing id is reported on its own, the rest still delete
        let outcomes = service
            .delete_purchase_order_lines(
                &context,
                vec![
                    "line_1".to_string(),
                    "missing".to_string(),
                    "line_3".to_string(),
                ],
            )
            .unwrap();
        assert_eq!(
            outcomes,
            vec![
                ("line_1".to_string(), Ok("line_1".to_string())),
                (
                    "missing".to_string(),
                    Err(DeletePurchaseOrderLineError::PurchaseOrderLineDoesNotExist)
                ),
                ("line_3".to_string(), Ok("line_3".to_string())),
            ]
        );
        assert_eq!(
            line_numbers(),
            vec![
                ("line_2".to_string(), 1),
                ("line_4".to_string(), 2),
                ("line_5".to_string(), 3),
            ]
        );

        assert_eq!(insert_line("line_6", 6.0).line_number, 4);
    }
}
