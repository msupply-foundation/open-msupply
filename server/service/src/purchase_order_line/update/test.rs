#[cfg(test)]
mod update {
    use repository::{
        ActivityLogRowRepository, ActivityLogType, InvoiceLineRow, InvoiceLineRowRepository,
        InvoiceRow, InvoiceRowRepository, InvoiceStatus, PurchaseOrderLineRow,
        PurchaseOrderLineRowRepository, PurchaseOrderLineStatus,
        mock::{
            MockDataInserts, mock_item_a, mock_item_b, mock_item_d, mock_purchase_order_a,
            mock_store_a,
        },
        test_db::setup_all,
    };

    use crate::{
        NullableUpdate,
        purchase_order::update::{UpdatePurchaseOrderError, UpdatePurchaseOrderInput},
        purchase_order_line::{
            insert::{InsertPurchaseOrderLineInput, PackSizeCodeCombination},
            update::{UpdatePurchaseOrderLineInput, UpdatePurchaseOrderLineInputError},
        },
        service_provider::ServiceProvider,
    };
    use chrono::NaiveDate;

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

        // Create a purchase order line
        service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "purchase_order_line_id_1".to_string(),
                    purchase_order_id: mock_purchase_order_a().id.to_string(),
                    item_id_or_code: mock_item_a().id.to_string(),
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
                    item_id_or_code: mock_item_a().id.to_string(),
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
            ),
            Err(UpdatePurchaseOrderLineInputError::CannotChangeStatus)
        );

        // CannotChangeStatus - to new from a sent purchase order
        purchase_order_service
            .update_purchase_order(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderInput {
                    id: "test_purchase_order_a".to_string(),
                    status: Some(repository::PurchaseOrderStatus::Sent),
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
                    status: Some(PurchaseOrderLineStatus::New),
                    ..Default::default()
                },
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
            ),
            Err(UpdatePurchaseOrderLineInputError::CannotEditRequestedQuantity)
        );

        // A shipped line blocks finalising until its inbound shipment is verified
        let line = PurchaseOrderLineRow {
            id: "purchase_order_line_received".to_string(),
            purchase_order_id: mock_purchase_order_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            line_number: 2,
            item_id: mock_item_b().id,
            requested_pack_size: 2.0,
            requested_number_of_units: 20.0,
            ..Default::default()
        };

        PurchaseOrderLineRowRepository::new(&context.connection)
            .upsert_one(&line)
            .unwrap();

        let invoice = InvoiceRow {
            id: "invoice_for_received".to_string(),
            store_id: mock_store_a().id.clone(),
            name_id: mock_store_a().name_id.clone(),
            purchase_order_id: Some(mock_purchase_order_a().id.clone()),
            status: InvoiceStatus::Shipped,
            ..Default::default()
        };

        InvoiceRowRepository::new(&context.connection)
            .upsert_one(&invoice)
            .unwrap();

        let invoice_line = InvoiceLineRow {
            id: "invoice_line_for_received".to_string(),
            invoice_id: invoice.id.clone(),
            item_id: mock_item_b().id,
            number_of_packs: 8.0,
            pack_size: 2.0,
            purchase_order_line_id: Some("purchase_order_line_received".to_string()),
            ..Default::default()
        };

        InvoiceLineRowRepository::new(&context.connection)
            .upsert_one(&invoice_line)
            .unwrap();

        // Cannot finalise PO when inbound shipments are not verified
        assert_eq!(
            purchase_order_service.update_purchase_order(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderInput {
                    id: "test_purchase_order_a".to_string(),
                    status: Some(repository::PurchaseOrderStatus::Finalised),
                    ..Default::default()
                },
            ),
            Err(UpdatePurchaseOrderError::InboundShipmentsNotVerified)
        );

        // Verify the inbound shipment so the PO can be finalised
        InvoiceRowRepository::new(&context.connection)
            .upsert_one(&InvoiceRow {
                status: InvoiceStatus::Verified,
                ..invoice.clone()
            })
            .unwrap();

        // Cannot change requested quantity on a finalised purchase order
        purchase_order_service
            .update_purchase_order(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderInput {
                    id: "test_purchase_order_a".to_string(),
                    status: Some(repository::PurchaseOrderStatus::Finalised),
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
                    requested_number_of_units: Some(5.0),
                    ..Default::default()
                },
            ),
            Err(UpdatePurchaseOrderLineInputError::CannotEditRequestedQuantity)
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
                    item_id_or_code: mock_item_a().id.to_string(),
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
            )
            .unwrap();

        assert_eq!(
            result.purchase_order_line_row.id,
            "purchase_order_line_id_1"
        );
        assert_eq!(result.item_row.id, mock_item_d().id.clone());

        let updated_logs = || {
            ActivityLogRowRepository::new(&context.connection)
                .find_many_by_record_id(&result.purchase_order_line_row.purchase_order_id)
                .unwrap()
                .into_iter()
                .filter(|l| l.r#type == ActivityLogType::PurchaseOrderLineUpdated)
                .collect::<Vec<_>>()
        };
        let logs = updated_logs();
        assert_eq!(logs.len(), 1);
        let log = &logs[0];

        // The entry names the line and carries each changed field's old and new value
        let from: serde_json::Value =
            serde_json::from_str(log.changed_from.as_ref().unwrap()).unwrap();
        let to: serde_json::Value = serde_json::from_str(log.changed_to.as_ref().unwrap()).unwrap();
        assert_eq!(result.purchase_order_line_row.item_name, mock_item_d().name);
        assert_eq!(
            from,
            serde_json::json!({
                "item-code": mock_item_a().code,
                "item-name": mock_item_a().name,
                "pack-size": 5.0,
                "requested-units": 0.0,
            })
        );
        assert_eq!(
            to,
            serde_json::json!({
                "item-code": mock_item_d().code,
                "item-name": mock_item_d().name,
                "pack-size": 10.0,
                "requested-units": 5.0,
            })
        );
        // The line's identity leads, so the entry reads line-first
        assert!(
            log.changed_to
                .as_ref()
                .unwrap()
                .starts_with(r#"{"item-code":"#)
        );

        // An update that changes nothing writes no entry
        service
            .update_purchase_order_line(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderLineInput {
                    id: "purchase_order_line_id_1".to_string(),
                    requested_pack_size: Some(10.0),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(updated_logs().len(), 1);

        // Clearing a field records its old value alone
        service
            .update_purchase_order_line(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderLineInput {
                    id: "purchase_order_line_id_1".to_string(),
                    expected_delivery_date: Some(NullableUpdate {
                        value: Some(NaiveDate::from_ymd_opt(2026, 9, 30).unwrap()),
                    }),
                    ..Default::default()
                },
            )
            .unwrap();
        service
            .update_purchase_order_line(
                &context,
                &mock_store_a().id.clone(),
                UpdatePurchaseOrderLineInput {
                    id: "purchase_order_line_id_1".to_string(),
                    expected_delivery_date: Some(NullableUpdate { value: None }),
                    ..Default::default()
                },
            )
            .unwrap();
        let logs = updated_logs();
        assert_eq!(logs.len(), 3);
        let from: serde_json::Value =
            serde_json::from_str(logs[2].changed_from.as_ref().unwrap()).unwrap();
        let to: serde_json::Value =
            serde_json::from_str(logs[2].changed_to.as_ref().unwrap()).unwrap();
        assert_eq!(
            from,
            serde_json::json!({ "expected-delivery-date": "2026-09-30" })
        );
        assert_eq!(
            to,
            serde_json::json!({
                "item-code": mock_item_d().code,
                "item-name": mock_item_d().name,
                "expected-delivery-date": null,
            })
        );
    }

    #[actix_rt::test]
    async fn update_purchase_order_line_logs_closure_once() {
        let (_, _, connection_manager, _) = setup_all(
            "update_purchase_order_line_logs_closure_once",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = &service_provider.purchase_order_line_service;

        service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "closing_line".to_string(),
                    purchase_order_id: "test_purchase_order_a".to_string(),
                    item_id_or_code: mock_item_a().id.to_string(),
                    requested_pack_size: Some(3.0),
                    ..Default::default()
                },
            )
            .unwrap();
        service_provider
            .purchase_order_service
            .update_purchase_order(
                &context,
                &mock_store_a().id,
                UpdatePurchaseOrderInput {
                    id: "test_purchase_order_a".to_string(),
                    status: Some(repository::PurchaseOrderStatus::Sent),
                    ..Default::default()
                },
            )
            .unwrap();

        let logs_of = |log_type: ActivityLogType| {
            ActivityLogRowRepository::new(&context.connection)
                .find_many_by_record_id("test_purchase_order_a")
                .unwrap()
                .into_iter()
                .filter(|l| l.r#type == log_type)
                .count()
        };

        service
            .update_purchase_order_line(
                &context,
                &mock_store_a().id,
                UpdatePurchaseOrderLineInput {
                    id: "closing_line".to_string(),
                    status: Some(PurchaseOrderLineStatus::Closed),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(logs_of(ActivityLogType::PurchaseOrderLineStatusClosed), 1);

        // A later edit of the closed line is an update, not another closure
        service
            .update_purchase_order_line(
                &context,
                &mock_store_a().id,
                UpdatePurchaseOrderLineInput {
                    id: "closing_line".to_string(),
                    comment: Some(NullableUpdate {
                        value: Some("late".to_string()),
                    }),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(logs_of(ActivityLogType::PurchaseOrderLineStatusClosed), 1);
        assert_eq!(logs_of(ActivityLogType::PurchaseOrderLineUpdated), 1);
    }

    /// The stored total is recomputed on every update from the merged figures:
    /// a quantity change moves it, a price change moves it, and a zero pack
    /// size zeroes it.
    #[actix_rt::test]
    async fn update_purchase_order_line_recomputes_line_total() {
        let (_, _, connection_manager, _) = setup_all(
            "update_purchase_order_line_recomputes_line_total",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id.clone(), "".to_string())
            .unwrap();
        let service = service_provider.purchase_order_line_service;
        let repo = PurchaseOrderLineRowRepository::new(&context.connection);
        let line_total = || {
            repo.find_one_by_id("po_line_total")
                .unwrap()
                .unwrap()
                .line_total
        };

        // 100 units at pack size 5 = 20 packs, at 6.00 = 120.00
        service
            .insert_purchase_order_line(
                &context,
                InsertPurchaseOrderLineInput {
                    id: "po_line_total".to_string(),
                    purchase_order_id: mock_purchase_order_a().id,
                    // Not an item the mock order already carries, so the final
                    // move to a zero pack size doesn't collide with an existing
                    // item/pack-size combination.
                    item_id_or_code: mock_item_d().id.to_string(),
                    requested_pack_size: Some(5.0),
                    requested_number_of_units: Some(100.0),
                    price_per_pack_after_discount: Some(6.0),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(line_total(), 120.0);

        let update = |input: UpdatePurchaseOrderLineInput| {
            service
                .update_purchase_order_line(
                    &context,
                    &mock_store_a().id,
                    UpdatePurchaseOrderLineInput {
                        id: "po_line_total".to_string(),
                        ..input
                    },
                )
                .unwrap();
        };

        // A quantity change moves it: 50 units = 10 packs at 6.00
        update(UpdatePurchaseOrderLineInput {
            requested_number_of_units: Some(50.0),
            ..Default::default()
        });
        assert_eq!(line_total(), 60.0);

        // A price change moves it: 10 packs at 8.00
        update(UpdatePurchaseOrderLineInput {
            price_per_pack_after_discount: Some(8.0),
            ..Default::default()
        });
        assert_eq!(line_total(), 80.0);

        // A zero pack size zeroes it rather than dividing by zero
        update(UpdatePurchaseOrderLineInput {
            requested_pack_size: Some(0.0),
            ..Default::default()
        });
        assert_eq!(line_total(), 0.0);
    }
}
