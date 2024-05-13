#[cfg(test)]
mod test {

    use chrono::{Duration, NaiveDate};
    use repository::{
        mock::{
            mock_item_a, mock_item_b, mock_name_a, mock_outbound_shipment_a_invoice_lines,
            mock_store_a, mock_store_b, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, InvoiceRow, InvoiceType,
        RepositoryError, StockLine, StockLineRow,
    };
    use util::{
        constants::stock_line_expiring_soon_offset, date_now, date_now_with_offset, inline_edit,
        inline_init,
    };

    use crate::{
        invoice_line::AllocateOutboundShipmentUnallocatedLineError as ServiceError,
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn allocate_unallocated_line_errors() {
        let (_, _, connection_manager, _) =
            setup_all("allocate_unallocated_line_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
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
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice".to_string();
                r.store_id = mock_store_a().id;
                r.name_link_id = mock_name_a().id;
                r.r#type = InvoiceType::OutboundShipment;
            })
        }

        fn line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "line".to_string();
                r.invoice_id = invoice().id;
                r.item_link_id = mock_item_a().id;
                r.r#type = InvoiceLineType::UnallocatedStock;
                r.number_of_packs = 20.0;
                r.pack_size = 1.0;
            })
        }

        fn stock_line() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line".to_string();
                r.store_id = mock_store_a().id;
                r.item_link_id = mock_item_a().id;
                r.pack_size = 2.0;
                r.available_number_of_packs = 30.0;
            })
        }

        // Stock line belonging to another store
        fn stock_line2() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line2".to_string();
                r.store_id = mock_store_b().id;
                r.item_link_id = mock_item_a().id;
                r.pack_size = 2.0;
                r.available_number_of_packs = 30.0;
            })
        }

        // Stock line belonging to another item
        fn stock_line3() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line3".to_string();
                r.store_id = mock_store_a().id;
                r.item_link_id = mock_item_b().id;
                r.pack_size = 2.0;
                r.available_number_of_packs = 30.0;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "allocate_unallocated_line_basic_success",
            MockDataInserts::none()
                .stores()
                .items()
                .names()
                .units()
                .currencies(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice()];
                r.invoice_lines = vec![line()];
                r.stock_lines = vec![stock_line(), stock_line2(), stock_line3()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
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

        assert_eq!(
            repo.find_one_by_id(&result.deletes[0]),
            Err(RepositoryError::NotFound)
        );

        let new_line = repo
            .find_one_by_id(&result.inserts[0].invoice_line_row.id)
            .unwrap();

        assert_eq!(
            new_line,
            inline_edit(&new_line, |mut u| {
                u.number_of_packs = 10.0;
                u.pack_size = 2.0;
                u
            })
        );
    }

    #[actix_rt::test]
    async fn allocate_unallocated_line_partial_allocate_and_fefo() {
        fn invoice() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice".to_string();
                r.store_id = mock_store_a().id;
                r.name_link_id = mock_name_a().id;
                r.r#type = InvoiceType::OutboundShipment;
            })
        }

        fn line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "line".to_string();
                r.invoice_id = invoice().id;
                r.item_link_id = mock_item_a().id;
                r.r#type = InvoiceLineType::UnallocatedStock;
                r.number_of_packs = 50.0;
                r.pack_size = 1.0;
            })
        }

        fn stock_line() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line".to_string();
                r.store_id = mock_store_a().id;
                r.item_link_id = mock_item_a().id;
                r.pack_size = 3.0;
                r.available_number_of_packs = 10.0;
                r.expiry_date = Some(NaiveDate::from_ymd_opt(3021, 1, 1).unwrap());
            })
        }

        fn stock_line2() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line2".to_string();
                r.store_id = mock_store_a().id;
                r.item_link_id = mock_item_a().id;
                r.pack_size = 3.0;
                r.available_number_of_packs = 2.0;
                r.expiry_date = Some(NaiveDate::from_ymd_opt(3021, 2, 1).unwrap());
            })
        }

        fn stock_line3() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line3".to_string();
                r.store_id = mock_store_a().id;
                r.item_link_id = mock_item_a().id;
                r.pack_size = 1.0;
                r.available_number_of_packs = 2.0;
                r.expiry_date = None;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "allocate_unallocated_line_partial_allocate_and_fefo",
            MockDataInserts::none()
                .stores()
                .items()
                .names()
                .units()
                .currencies(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice()];
                r.invoice_lines = vec![line()];
                // make sure to insert in wrong order
                r.stock_lines = vec![stock_line3(), stock_line2(), stock_line()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
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
            .unwrap();

        assert_eq!(
            new_line1,
            inline_edit(&new_line1, |mut u| {
                u.number_of_packs = 10.0;
                u.pack_size = 3.0;
                u
            })
        );

        let new_line2 = repo
            .find_one_by_id(&result.inserts[1].invoice_line_row.id)
            .unwrap();

        assert_eq!(
            new_line2,
            inline_edit(&new_line2, |mut u| {
                u.number_of_packs = 2.0;
                u.pack_size = 3.0;
                u
            })
        );

        let new_line3 = repo
            .find_one_by_id(&result.inserts[2].invoice_line_row.id)
            .unwrap();

        assert_eq!(
            new_line3,
            inline_edit(&new_line3, |mut u| {
                u.number_of_packs = 2.0;
                u.pack_size = 1.0;
                u
            })
        );

        let updated_uallocated_line = repo
            .find_one_by_id(&result.updates[0].invoice_line_row.id)
            .unwrap();

        assert_eq!(
            updated_uallocated_line,
            inline_edit(&updated_uallocated_line, |mut u| {
                u.number_of_packs = 12.0;
                u
            })
        );
    }

    #[actix_rt::test]
    async fn allocate_unallocated_line_allocate_alerts() {
        fn invoice() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice".to_string();
                r.store_id = mock_store_a().id;
                r.name_link_id = mock_name_a().id;
                r.r#type = InvoiceType::OutboundShipment;
            })
        }

        fn line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "line".to_string();
                r.invoice_id = invoice().id;
                r.item_link_id = mock_item_a().id;
                r.r#type = InvoiceLineType::UnallocatedStock;
                r.number_of_packs = 3.0;
                r.pack_size = 1.0;
            })
        }

        fn base_stock_line(id: &str) -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = id.to_string();
                r.store_id = mock_store_a().id;
                r.item_link_id = mock_item_a().id;
                r.pack_size = 1.0;
                r.available_number_of_packs = 1.0;
            })
        }

        fn stock_line_expired() -> StockLineRow {
            inline_edit(&base_stock_line("stock_line_expired"), |mut u| {
                u.expiry_date = Some(NaiveDate::from_ymd_opt(2021, 1, 1).unwrap());
                u
            })
        }

        fn stock_line_expiring_soon() -> StockLineRow {
            inline_edit(&base_stock_line("stock_line_expiring_soon"), |mut u| {
                u.expiry_date = Some(date_now_with_offset(
                    stock_line_expiring_soon_offset() - Duration::days(1),
                ));
                u
            })
        }

        fn stock_line_on_hold() -> StockLineRow {
            inline_edit(&base_stock_line("stock_line_on_hold"), |mut u| {
                u.expiry_date = Some(date_now());
                u.on_hold = true;
                u
            })
        }

        fn stock_line_not_expired() -> StockLineRow {
            inline_edit(&base_stock_line("stock_line_not_expired"), |mut u| {
                u.expiry_date = Some(date_now_with_offset(
                    stock_line_expiring_soon_offset() + Duration::days(1),
                ));
                u
            })
        }

        fn stock_line_expiry_null() -> StockLineRow {
            inline_edit(&base_stock_line("stock_line_expiry_null"), |mut u| {
                u.expiry_date = None;
                u
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "allocate_unallocated_line_partial_allocate",
            MockDataInserts::none()
                .stores()
                .items()
                .names()
                .units()
                .currencies(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice()];
                r.invoice_lines = vec![line()];
                // make sure to insert in wrong order
                r.stock_lines = vec![
                    stock_line_expiry_null(),
                    stock_line_not_expired(),
                    stock_line_on_hold(),
                    stock_line_expiring_soon(),
                    stock_line_expired(),
                ];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
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
            inline_init(|r: &mut StockLine| {
                r.stock_line_row = stock_line_expired();
                r.item_row = mock_item_a();
            })
        );

        assert_eq!(
            result.skipped_on_hold_stock_lines[0],
            inline_init(|r: &mut StockLine| {
                r.stock_line_row = stock_line_on_hold();
                r.item_row = mock_item_a();
            })
        );

        assert_eq!(
            result.issued_expiring_soon_stock_lines[0],
            inline_init(|r: &mut StockLine| {
                r.stock_line_row = stock_line_expiring_soon();
                r.item_row = mock_item_a();
            })
        );
    }

    #[actix_rt::test]
    async fn allocate_unallocated_line_add_to_existing_lines() {
        fn invoice() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice".to_string();
                r.store_id = mock_store_a().id;
                r.name_link_id = mock_name_a().id;
                r.r#type = InvoiceType::OutboundShipment;
            })
        }

        fn line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "line".to_string();
                r.invoice_id = invoice().id;
                r.item_link_id = mock_item_a().id;
                r.r#type = InvoiceLineType::UnallocatedStock;
                r.number_of_packs = 50.0;
                r.pack_size = 1.0;
            })
        }

        fn stock_line() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line".to_string();
                r.store_id = mock_store_a().id;
                r.item_link_id = mock_item_a().id;
                r.pack_size = 1.0;
                r.available_number_of_packs = 30.0;
                r.expiry_date = Some(NaiveDate::from_ymd_opt(3021, 2, 1).unwrap());
            })
        }

        fn allocated_line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "allocated_line".to_string();
                r.invoice_id = invoice().id;
                r.item_link_id = mock_item_a().id;
                r.stock_line_id = Some(stock_line().id);
                r.r#type = InvoiceLineType::StockOut;
                r.number_of_packs = 2.0;
                r.pack_size = 1.0;
            })
        }

        fn stock_line2() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line2".to_string();
                r.store_id = mock_store_a().id;
                r.item_link_id = mock_item_a().id;
                r.pack_size = 1.0;
                r.available_number_of_packs = 5.0;
            })
        }

        fn allocated_line2() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "allocated_line2".to_string();
                r.invoice_id = invoice().id;
                r.item_link_id = mock_item_a().id;
                r.stock_line_id = Some(stock_line2().id);
                r.r#type = InvoiceLineType::StockOut;
                r.number_of_packs = 10.0;
                r.pack_size = 1.0;
            })
        }

        fn stock_line3() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line3".to_string();
                r.store_id = mock_store_a().id;
                r.item_link_id = mock_item_a().id;
                r.pack_size = 1.0;
                r.available_number_of_packs = 100.0;
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "allocate_unallocated_line_add_to_existing_lines",
            MockDataInserts::none()
                .stores()
                .items()
                .names()
                .units()
                .currencies(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice()];
                r.invoice_lines = vec![line(), allocated_line(), allocated_line2()];
                r.stock_lines = vec![stock_line(), stock_line2(), stock_line3()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
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
        assert_eq!(
            update,
            inline_edit(&update, |mut u| {
                u.invoice_line_row.id = allocated_line().id;
                u.invoice_line_row.number_of_packs = 32.0;
                u
            })
        );

        let update = result.updates[1].clone();
        assert_eq!(
            update,
            inline_edit(&update, |mut u| {
                u.invoice_line_row.id = allocated_line2().id;
                u.invoice_line_row.number_of_packs = 15.0;
                u
            })
        );

        let insert = result.inserts[0].clone();
        assert_eq!(
            insert,
            inline_edit(&insert, |mut u| {
                u.invoice_line_row.number_of_packs = 15.0;
                u
            })
        );
    }

    #[actix_rt::test]
    async fn allocate_unallocated_line_round_up() {
        fn invoice() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice".to_string();
                r.store_id = mock_store_a().id;
                r.name_link_id = mock_name_a().id;
                r.r#type = InvoiceType::OutboundShipment;
            })
        }

        fn line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "line".to_string();
                r.invoice_id = invoice().id;
                r.item_link_id = mock_item_a().id;
                r.r#type = InvoiceLineType::UnallocatedStock;
                r.number_of_packs = 1.0;
                r.pack_size = 1.0;
            })
        }

        fn stock_line() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line".to_string();
                r.store_id = mock_store_a().id;
                r.item_link_id = mock_item_a().id;
                r.pack_size = 3.0;
                r.available_number_of_packs = 3.0;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "allocate_unallocated_line_round_up",
            MockDataInserts::none()
                .stores()
                .items()
                .names()
                .units()
                .currencies(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice()];
                r.invoice_lines = vec![line()];
                r.stock_lines = vec![stock_line()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
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

        assert_eq!(
            repo.find_one_by_id(&result.deletes[0]),
            Err(RepositoryError::NotFound)
        );

        let new_line = repo
            .find_one_by_id(&result.inserts[0].invoice_line_row.id)
            .unwrap();

        assert_eq!(
            new_line,
            inline_edit(&new_line, |mut u| {
                u.number_of_packs = 1.0;
                u.pack_size = 3.0;
                u
            })
        );
    }
}
