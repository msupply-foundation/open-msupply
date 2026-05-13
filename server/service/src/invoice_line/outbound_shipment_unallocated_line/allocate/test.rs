#[cfg(test)]
mod test {

    use chrono::{Duration, NaiveDate};
    use repository::{
        mock::{
            mock_item_a, mock_item_b, mock_name_a, mock_outbound_shipment_a_invoice_lines,
            mock_store_a, mock_store_b, mock_vaccine_item_a, mock_vvm_status_a, mock_vvm_status_b,
            mock_vvm_status_c_level3_unusable, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, InvoiceRow, InvoiceType,
        PreferenceRow, PreferenceRowRepository, StockLine, StockLineRow,
    };
    use util::constants::stock_line_expiring_soon_offset;
    use util::{date_now, date_now_with_offset};

    use crate::{
        invoice_line::AllocateOutboundShipmentUnallocatedLineError as ServiceError,
        preference::{Preference, SortByVvmStatusThenExpiry},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn allocate_unallocated_line_errors() {
        let (_, _, connection_manager, _) =
            setup_all("allocate_unallocated_line_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // Line Does not Exist
        assert_eq!(
            service.allocate_outbound_shipment_unallocated_line(&context, "invalid".to_string(),),
            Err(ServiceError::LineDoesNotExist)
        );

        // LineIsNotUnallocatedLine
        assert_eq!(
            service.allocate_outbound_shipment_unallocated_line(
                &context,
                mock_outbound_shipment_a_invoice_lines()[0].id.clone()
            ),
            Err(ServiceError::LineIsNotUnallocatedLine)
        );
    }

    #[actix_rt::test]
    async fn allocate_unallocated_line_basic_success() {
        fn invoice() -> InvoiceRow {
            InvoiceRow {
                id: "invoice".to_string(),
                store_id: mock_store_a().id,
                name_id: mock_name_a().id,
                r#type: InvoiceType::OutboundShipment,
                ..Default::default()
            }
        }

        fn line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "line".to_string(),
                invoice_id: invoice().id,
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::UnallocatedStock,
                number_of_packs: 20.0,
                pack_size: 1.0,
                ..Default::default()
            }
        }

        fn stock_line() -> StockLineRow {
            StockLineRow {
                id: "stock_line".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_item_a().id,
                pack_size: 2.0,
                available_number_of_packs: 30.0,
                ..Default::default()
            }
        }

        // Stock line belonging to another store
        fn stock_line2() -> StockLineRow {
            StockLineRow {
                id: "stock_line2".to_string(),
                store_id: mock_store_b().id,
                item_link_id: mock_item_a().id,
                pack_size: 2.0,
                available_number_of_packs: 30.0,
                ..Default::default()
            }
        }

        // Stock line belonging to another item
        fn stock_line3() -> StockLineRow {
            StockLineRow {
                id: "stock_line3".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_item_b().id,
                pack_size: 2.0,
                available_number_of_packs: 30.0,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "allocate_unallocated_line_basic_success",
            MockDataInserts::none()
                .stores()
                .items()
                .names()
                .units()
                .currencies(),
            MockData {
                invoices: vec![invoice()],
                invoice_lines: vec![line()],
                stock_lines: vec![stock_line(), stock_line2(), stock_line3()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        let result = service
            .allocate_outbound_shipment_unallocated_line(&context, line().id.clone())
            .unwrap();

        assert_eq!(result.inserts.len(), 1);
        assert_eq!(result.deletes.len(), 1);
        assert_eq!(result.updates.len(), 0);

        let repo = InvoiceLineRowRepository::new(&connection);

        assert_eq!(repo.find_one_by_id(&result.deletes[0]), Ok(None));

        let new_line = repo
            .find_one_by_id(&result.inserts[0].invoice_line_row.id)
            .unwrap()
            .unwrap();

        assert_eq!(new_line.number_of_packs, 10.0);
        assert_eq!(new_line.pack_size, 2.0);
    }

    #[actix_rt::test]
    async fn allocate_unallocated_line_partial_allocate_and_fefo() {
        fn invoice() -> InvoiceRow {
            InvoiceRow {
                id: "invoice".to_string(),
                store_id: mock_store_a().id,
                name_id: mock_name_a().id,
                r#type: InvoiceType::OutboundShipment,
                ..Default::default()
            }
        }

        fn line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "line".to_string(),
                invoice_id: invoice().id,
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::UnallocatedStock,
                number_of_packs: 50.0,
                pack_size: 1.0,
                ..Default::default()
            }
        }

        fn stock_line() -> StockLineRow {
            StockLineRow {
                id: "first_expiring".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_item_a().id,
                pack_size: 3.0,
                available_number_of_packs: 10.0,
                expiry_date: Some(NaiveDate::from_ymd_opt(3021, 1, 1).unwrap()),
                ..Default::default()
            }
        }

        fn stock_line2() -> StockLineRow {
            StockLineRow {
                id: "second_expiring".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_item_a().id,
                pack_size: 3.0,
                available_number_of_packs: 2.0,
                expiry_date: Some(NaiveDate::from_ymd_opt(3021, 2, 1).unwrap()),
                ..Default::default()
            }
        }

        fn stock_line3() -> StockLineRow {
            StockLineRow {
                id: "non_expiring".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_item_a().id,
                pack_size: 1.0,
                available_number_of_packs: 2.0,
                expiry_date: None,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "allocate_unallocated_line_partial_allocate_and_fefo",
            MockDataInserts::none()
                .stores()
                .items()
                .names()
                .units()
                .currencies(),
            MockData {
                invoices: vec![invoice()],
                invoice_lines: vec![line()],
                // make sure to insert in wrong order
                stock_lines: vec![stock_line3(), stock_line2(), stock_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        let result = service
            .allocate_outbound_shipment_unallocated_line(&context, line().id.clone())
            .unwrap();

        assert_eq!(result.inserts.len(), 3);
        assert_eq!(result.deletes.len(), 0);
        assert_eq!(result.updates.len(), 1);

        let repo = InvoiceLineRowRepository::new(&connection);

        let new_line1 = repo
            .find_one_by_id(&result.inserts[0].invoice_line_row.id)
            .unwrap()
            .unwrap();

        assert_eq!(new_line1.stock_line_id, Some("first_expiring".to_string()));

        let new_line2 = repo
            .find_one_by_id(&result.inserts[1].invoice_line_row.id)
            .unwrap()
            .unwrap();

        assert_eq!(new_line2.stock_line_id, Some("second_expiring".to_string()));

        let new_line3 = repo
            .find_one_by_id(&result.inserts[2].invoice_line_row.id)
            .unwrap()
            .unwrap();

        assert_eq!(new_line3.stock_line_id, Some("non_expiring".to_string()));

        let updated_unallocated_line = repo
            .find_one_by_id(&result.updates[0].invoice_line_row.id)
            .unwrap()
            .unwrap();

        assert_eq!(updated_unallocated_line.number_of_packs, 12.0);
    }

    #[actix_rt::test]
    async fn allocate_unallocated_line_allocate_alerts() {
        fn invoice() -> InvoiceRow {
            InvoiceRow {
                id: "invoice".to_string(),
                store_id: mock_store_a().id,
                name_id: mock_name_a().id,
                r#type: InvoiceType::OutboundShipment,
                ..Default::default()
            }
        }

        fn line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "line".to_string(),
                invoice_id: invoice().id,
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::UnallocatedStock,
                number_of_packs: 3.0,
                pack_size: 1.0,
                ..Default::default()
            }
        }

        fn base_stock_line(id: &str) -> StockLineRow {
            StockLineRow {
                id: id.to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_item_a().id,
                pack_size: 1.0,
                available_number_of_packs: 1.0,
                ..Default::default()
            }
        }

        fn stock_line_expired() -> StockLineRow {
            StockLineRow {
                expiry_date: Some(NaiveDate::from_ymd_opt(2021, 1, 1).unwrap()),
                ..base_stock_line("stock_line_expired")
            }
        }

        fn stock_line_expiring_soon() -> StockLineRow {
            StockLineRow {
                expiry_date: Some(date_now_with_offset(
                    stock_line_expiring_soon_offset() - Duration::days(1),
                )),
                ..base_stock_line("stock_line_expiring_soon")
            }
        }

        fn stock_line_on_hold() -> StockLineRow {
            StockLineRow {
                expiry_date: Some(date_now()),
                on_hold: true,
                ..base_stock_line("stock_line_on_hold")
            }
        }

        fn stock_line_not_expired() -> StockLineRow {
            StockLineRow {
                expiry_date: Some(date_now_with_offset(
                    stock_line_expiring_soon_offset() + Duration::days(1),
                )),
                ..base_stock_line("stock_line_not_expired")
            }
        }

        fn stock_line_expiry_null() -> StockLineRow {
            StockLineRow {
                expiry_date: None,
                ..base_stock_line("stock_line_expiry_null")
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "allocate_unallocated_line_partial_allocate",
            MockDataInserts::none()
                .stores()
                .items()
                .names()
                .units()
                .currencies(),
            MockData {
                invoices: vec![invoice()],
                invoice_lines: vec![line()],
                // make sure to insert in wrong order
                stock_lines: vec![
                    stock_line_expiry_null(),
                    stock_line_not_expired(),
                    stock_line_on_hold(),
                    stock_line_expiring_soon(),
                    stock_line_expired(),
                ],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        let result = service
            .allocate_outbound_shipment_unallocated_line(&context, line().id.clone())
            .unwrap();

        assert_eq!(result.inserts.len(), 3);
        assert_eq!(result.deletes.len(), 1);
        assert_eq!(result.updates.len(), 0);
        assert_eq!(result.skipped_expired_stock_lines.len(), 1);
        assert_eq!(result.skipped_on_hold_stock_lines.len(), 1);
        assert_eq!(result.issued_expiring_soon_stock_lines.len(), 1);

        assert_eq!(
            result.inserts[0].invoice_line_row.stock_line_id,
            Some(stock_line_expiring_soon().id)
        );
        assert_eq!(
            result.inserts[1].invoice_line_row.stock_line_id,
            Some(stock_line_not_expired().id)
        );
        assert_eq!(
            result.inserts[2].invoice_line_row.stock_line_id,
            Some(stock_line_expiry_null().id)
        );

        assert_eq!(result.skipped_on_hold_stock_lines.len(), 1);
        assert_eq!(result.issued_expiring_soon_stock_lines.len(), 1);

        assert_eq!(
            result.skipped_expired_stock_lines[0],
            StockLine {
                stock_line_row: stock_line_expired(),
                item_row: mock_item_a(),
                ..Default::default()
            }
        );

        assert_eq!(
            result.skipped_on_hold_stock_lines[0],
            StockLine {
                stock_line_row: stock_line_on_hold(),
                item_row: mock_item_a(),
                ..Default::default()
            }
        );

        assert_eq!(
            result.issued_expiring_soon_stock_lines[0],
            StockLine {
                stock_line_row: stock_line_expiring_soon(),
                item_row: mock_item_a(),
                ..Default::default()
            }
        );
    }

    #[actix_rt::test]
    async fn allocate_unallocated_line_add_to_existing_lines() {
        fn invoice() -> InvoiceRow {
            InvoiceRow {
                id: "invoice".to_string(),
                store_id: mock_store_a().id,
                name_id: mock_name_a().id,
                r#type: InvoiceType::OutboundShipment,
                ..Default::default()
            }
        }

        fn line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "line".to_string(),
                invoice_id: invoice().id,
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::UnallocatedStock,
                number_of_packs: 50.0,
                pack_size: 1.0,
                ..Default::default()
            }
        }

        fn stock_line() -> StockLineRow {
            StockLineRow {
                id: "stock_line".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_item_a().id,
                pack_size: 1.0,
                available_number_of_packs: 30.0,
                expiry_date: Some(NaiveDate::from_ymd_opt(3021, 2, 1).unwrap()),
                ..Default::default()
            }
        }

        fn allocated_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "allocated_line".to_string(),
                invoice_id: invoice().id,
                item_link_id: mock_item_a().id,
                stock_line_id: Some(stock_line().id),
                r#type: InvoiceLineType::StockOut,
                number_of_packs: 2.0,
                pack_size: 1.0,
                ..Default::default()
            }
        }

        fn stock_line2() -> StockLineRow {
            StockLineRow {
                id: "stock_line2".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_item_a().id,
                pack_size: 1.0,
                available_number_of_packs: 5.0,
                ..Default::default()
            }
        }

        fn allocated_line2() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "allocated_line2".to_string(),
                invoice_id: invoice().id,
                item_link_id: mock_item_a().id,
                stock_line_id: Some(stock_line2().id),
                r#type: InvoiceLineType::StockOut,
                number_of_packs: 10.0,
                pack_size: 1.0,
                ..Default::default()
            }
        }

        fn stock_line3() -> StockLineRow {
            StockLineRow {
                id: "stock_line3".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_item_a().id,
                pack_size: 1.0,
                available_number_of_packs: 100.0,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "allocate_unallocated_line_add_to_existing_lines",
            MockDataInserts::none()
                .stores()
                .items()
                .names()
                .units()
                .currencies(),
            MockData {
                invoices: vec![invoice()],
                invoice_lines: vec![line(), allocated_line(), allocated_line2()],
                stock_lines: vec![stock_line(), stock_line2(), stock_line3()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        let result = service
            .allocate_outbound_shipment_unallocated_line(&context, line().id.clone())
            .unwrap();

        assert_eq!(result.inserts.len(), 1);
        assert_eq!(result.deletes.len(), 1);
        assert_eq!(result.updates.len(), 2);

        let update = result.updates[0].clone();
        assert_eq!(update.invoice_line_row.id, allocated_line().id);
        assert_eq!(update.invoice_line_row.number_of_packs, 32.0);

        let update = result.updates[1].clone();
        assert_eq!(update.invoice_line_row.id, allocated_line2().id);
        assert_eq!(update.invoice_line_row.number_of_packs, 15.0);

        let insert = result.inserts[0].clone();
        assert_eq!(insert.invoice_line_row.number_of_packs, 15.0);
    }

    #[actix_rt::test]
    async fn allocate_unallocated_line_round_up() {
        fn invoice() -> InvoiceRow {
            InvoiceRow {
                id: "invoice".to_string(),
                store_id: mock_store_a().id,
                name_id: mock_name_a().id,
                r#type: InvoiceType::OutboundShipment,
                ..Default::default()
            }
        }

        fn line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "line".to_string(),
                invoice_id: invoice().id,
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::UnallocatedStock,
                number_of_packs: 1.0,
                pack_size: 1.0,
                ..Default::default()
            }
        }

        fn stock_line() -> StockLineRow {
            StockLineRow {
                id: "stock_line".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_item_a().id,
                pack_size: 3.0,
                available_number_of_packs: 3.0,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "allocate_unallocated_line_round_up",
            MockDataInserts::none()
                .stores()
                .items()
                .names()
                .units()
                .currencies(),
            MockData {
                invoices: vec![invoice()],
                invoice_lines: vec![line()],
                stock_lines: vec![stock_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        let result = service
            .allocate_outbound_shipment_unallocated_line(&context, line().id.clone())
            .unwrap();

        assert_eq!(result.inserts.len(), 1);
        assert_eq!(result.deletes.len(), 1);
        assert_eq!(result.updates.len(), 0);

        let repo = InvoiceLineRowRepository::new(&connection);

        assert_eq!(repo.find_one_by_id(&result.deletes[0]), Ok(None));

        let new_line = repo
            .find_one_by_id(&result.inserts[0].invoice_line_row.id)
            .unwrap()
            .unwrap();

        assert_eq!(new_line.number_of_packs, 1.0);
        assert_eq!(new_line.pack_size, 3.0);
    }

    #[actix_rt::test]
    async fn allocate_by_vvm_then_expiry() {
        fn invoice() -> InvoiceRow {
            InvoiceRow {
                id: "invoice".to_string(),
                store_id: mock_store_a().id,
                name_id: mock_name_a().id,
                r#type: InvoiceType::OutboundShipment,
                ..Default::default()
            }
        }

        fn placeholder() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "placeholder".to_string(),
                invoice_id: invoice().id,
                item_link_id: mock_vaccine_item_a().id,
                r#type: InvoiceLineType::UnallocatedStock,
                number_of_packs: 2.0,
                pack_size: 1.0,
                ..Default::default()
            }
        }
        fn vvm_3_unusable_stock_line() -> StockLineRow {
            StockLineRow {
                id: "vvm_3_unusable_stock_line".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_vaccine_item_a().id,
                pack_size: 1.0,
                available_number_of_packs: 2.0,
                vvm_status_id: Some(mock_vvm_status_c_level3_unusable().id), // Level 3
                ..Default::default()
            }
        }
        fn vvm_2_stock_line() -> StockLineRow {
            StockLineRow {
                id: "vvm_2_stock_line".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_vaccine_item_a().id,
                pack_size: 1.0,
                available_number_of_packs: 2.0,
                vvm_status_id: Some(mock_vvm_status_b().id), // Level 2 - allocated after level 1
                // No expiry- in FEFO we'd allocate this last
                expiry_date: None,
                ..Default::default()
            }
        }
        fn vvm_1_stock_line_expiring() -> StockLineRow {
            StockLineRow {
                id: "vvm_1_stock_line_expiring".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_vaccine_item_a().id,
                pack_size: 1.0,
                available_number_of_packs: 2.0,
                vvm_status_id: Some(mock_vvm_status_a().id), // Level 1 - should be allocated first
                // Has an expiry, should be allocated before non-expiring
                expiry_date: Some(NaiveDate::from_ymd_opt(2100, 1, 1).unwrap()),
                ..Default::default()
            }
        }
        fn vvm_1_stock_line_non_expiring() -> StockLineRow {
            StockLineRow {
                id: "vvm_1_stock_line_non_expiring".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_vaccine_item_a().id,
                pack_size: 1.0,
                available_number_of_packs: 2.0,
                vvm_status_id: Some(mock_vvm_status_a().id), // Level 1 - should be allocated first
                // No expiry, should be allocated last
                expiry_date: None,
                ..Default::default()
            }
        }
        fn stock_line_non_expiring_no_vvm() -> StockLineRow {
            StockLineRow {
                id: "stock_line_non_expiring_no_vvm".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_vaccine_item_a().id,
                pack_size: 1.0,
                available_number_of_packs: 2.0,
                // No expiry, should be allocated last
                vvm_status_id: None,
                expiry_date: None,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "allocate_by_vvm_then_expiry",
            MockDataInserts::none()
                .stores()
                .items()
                .vvm_statuses()
                .names()
                .units()
                .currencies(),
            MockData {
                invoices: vec![invoice()],
                invoice_lines: vec![placeholder()],
                stock_lines: vec![
                    stock_line_non_expiring_no_vvm(),
                    vvm_1_stock_line_non_expiring(),
                    vvm_1_stock_line_expiring(),
                    vvm_2_stock_line(),
                    vvm_3_unusable_stock_line(),
                ],
                ..Default::default()
            },
        )
        .await;

        // Enable manage vaccines in doses preference
        PreferenceRowRepository::new(&connection)
            .upsert_one(&PreferenceRow {
                id: "vvm_pref".to_string(),
                store_id: Some(mock_store_a().id),
                key: SortByVvmStatusThenExpiry.key().to_string(),
                value: "true".to_string(),
            })
            .unwrap();

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // ------ VVM 1 first
        let result = service
            // Allocate placeholder for 2 packs
            .allocate_outbound_shipment_unallocated_line(&context, placeholder().id.clone())
            .unwrap();
        assert_eq!(result.inserts.len(), 1);

        // Allocates the 2 packs from vvm1 expiring line first
        assert_eq!(
            result.inserts[0].invoice_line_row.stock_line_id,
            Some(vvm_1_stock_line_expiring().id)
        );

        let repo = InvoiceLineRowRepository::new(&connection);

        // ------ Next VVM 1, non-expiring
        // Insert placeholder for another 2 packs
        repo.upsert_one(&placeholder()).unwrap();

        // Allocate again
        let result = service
            .allocate_outbound_shipment_unallocated_line(&context, placeholder().id.clone())
            .unwrap();

        // Now uses the vvm1 expiring line
        assert_eq!(
            result.inserts[0].invoice_line_row.stock_line_id,
            Some(vvm_1_stock_line_non_expiring().id)
        );

        // ------ Now VVM 2
        // Insert placeholder for another 2 packs
        repo.upsert_one(&placeholder()).unwrap();

        // Allocate again
        let result = service
            .allocate_outbound_shipment_unallocated_line(&context, placeholder().id.clone())
            .unwrap();

        // Now uses the vvm2
        assert_eq!(
            result.inserts[0].invoice_line_row.stock_line_id,
            Some(vvm_2_stock_line().id)
        );
        // ------ No VVM last
        // Insert placeholder for another 2 packs
        repo.upsert_one(&placeholder()).unwrap();

        // Allocate again
        let result = service
            .allocate_outbound_shipment_unallocated_line(&context, placeholder().id.clone())
            .unwrap();

        // Now uses the no vvm non-expiring line
        assert_eq!(
            result.inserts[0].invoice_line_row.stock_line_id,
            Some(stock_line_non_expiring_no_vvm().id)
        );

        // ------ Unusable VVM - check not used
        // Insert placeholder for another 2 packs
        repo.upsert_one(&placeholder()).unwrap();

        // Allocate again
        let result = service
            .allocate_outbound_shipment_unallocated_line(&context, placeholder().id.clone())
            .unwrap();

        // Now uses the no vvm non-expiring line
        assert_eq!(result.inserts.len(), 0);
        assert_eq!(
            result.skipped_unusable_vvm_status_lines[0]
                .stock_line_row
                .id,
            vvm_3_unusable_stock_line().id
        );
    }
}
