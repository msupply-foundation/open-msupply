#[cfg(test)]
mod test {

    use chrono::NaiveDate;
    use repository::{
        mock::{
            mock_item_a, mock_item_b, mock_name_a, mock_outbound_shipment_a_invoice_lines,
            mock_store_a, mock_store_b, MockData, MockDataInserts,
        },
        schema::{InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowType, StockLineRow},
        test_db::{setup_all, setup_all_with_data},
        InvoiceLineRowRepository, RepositoryError,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice_line::AllocateOutboundShipmentUnallocatedLineError as ServiceError,
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn allocate_unallocated_line_errors() {
        let (_, _, connection_manager, _) =
            setup_all("allocate_unallocated_line_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        // Line Does not Exist
        assert_eq!(
            service.allocate_outbound_shipment_unallocated_line(
                &context,
                "store_a",
                "invalid".to_string(),
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // LineIsNotUnallocatedLine
        assert_eq!(
            service.allocate_outbound_shipment_unallocated_line(
                &context,
                "store_a",
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
                r.name_id = mock_name_a().id;
                r.r#type = InvoiceRowType::OutboundShipment;
            })
        }

        fn line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "line".to_string();
                r.invoice_id = invoice().id;
                r.item_id = mock_item_a().id;
                r.r#type = InvoiceLineRowType::UnallocatedStock;
                r.number_of_packs = 20;
                r.pack_size = 1;
            })
        }

        fn stock_line() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line".to_string();
                r.store_id = mock_store_a().id;
                r.item_id = mock_item_a().id;
                r.pack_size = 2;
                r.available_number_of_packs = 30;
            })
        }

        // Stock line belonging to another store
        fn stock_line2() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line2".to_string();
                r.store_id = mock_store_b().id;
                r.item_id = mock_item_a().id;
                r.pack_size = 2;
                r.available_number_of_packs = 30;
            })
        }

        // Stock line belonging to another item
        fn stock_line3() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line3".to_string();
                r.store_id = mock_store_a().id;
                r.item_id = mock_item_b().id;
                r.pack_size = 2;
                r.available_number_of_packs = 30;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "allocate_unallocated_line_basic_success",
            MockDataInserts::none().stores().items().names().units(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice()];
                r.invoice_lines = vec![line()];
                r.stock_lines = vec![stock_line(), stock_line2(), stock_line3()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        let result = service
            .allocate_outbound_shipment_unallocated_line(
                &context,
                &mock_store_a().id,
                line().id.clone(),
            )
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
                u.number_of_packs = 10;
                u.pack_size = 2;
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
                r.name_id = mock_name_a().id;
                r.r#type = InvoiceRowType::OutboundShipment;
            })
        }

        fn line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "line".to_string();
                r.invoice_id = invoice().id;
                r.item_id = mock_item_a().id;
                r.r#type = InvoiceLineRowType::UnallocatedStock;
                r.number_of_packs = 50;
                r.pack_size = 1;
            })
        }

        fn stock_line() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line".to_string();
                r.store_id = mock_store_a().id;
                r.item_id = mock_item_a().id;
                r.pack_size = 3;
                r.available_number_of_packs = 10;
                r.expiry_date = Some(NaiveDate::from_ymd(2021, 01, 01))
            })
        }

        fn stock_line2() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line2".to_string();
                r.store_id = mock_store_a().id;
                r.item_id = mock_item_a().id;
                r.pack_size = 3;
                r.available_number_of_packs = 2;
                r.expiry_date = Some(NaiveDate::from_ymd(2021, 02, 01))
            })
        }

        fn stock_line3() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line3".to_string();
                r.store_id = mock_store_a().id;
                r.item_id = mock_item_a().id;
                r.pack_size = 1;
                r.available_number_of_packs = 2;
                r.expiry_date = None
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "allocate_unallocated_line_partial_allocate",
            MockDataInserts::none().stores().items().names().units(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice()];
                r.invoice_lines = vec![line()];
                // make sure to insert in wrong order
                r.stock_lines = vec![stock_line3(), stock_line2(), stock_line()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        let result = service
            .allocate_outbound_shipment_unallocated_line(
                &context,
                &mock_store_a().id,
                line().id.clone(),
            )
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
                u.number_of_packs = 10;
                u.pack_size = 3;
                u
            })
        );

        let new_line2 = repo
            .find_one_by_id(&result.inserts[1].invoice_line_row.id)
            .unwrap();

        assert_eq!(
            new_line2,
            inline_edit(&new_line2, |mut u| {
                u.number_of_packs = 2;
                u.pack_size = 3;
                u
            })
        );

        let new_line3 = repo
            .find_one_by_id(&result.inserts[2].invoice_line_row.id)
            .unwrap();

        assert_eq!(
            new_line3,
            inline_edit(&new_line3, |mut u| {
                u.number_of_packs = 2;
                u.pack_size = 1;
                u
            })
        );

        let updated_uallocated_line = repo
            .find_one_by_id(&result.updates[0].invoice_line_row.id)
            .unwrap();

        assert_eq!(
            updated_uallocated_line,
            inline_edit(&updated_uallocated_line, |mut u| {
                u.number_of_packs = 12;
                u
            })
        );
    }

    #[actix_rt::test]
    async fn allocate_unallocated_line_add_to_existing_lines() {
        fn invoice() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice".to_string();
                r.store_id = mock_store_a().id;
                r.name_id = mock_name_a().id;
                r.r#type = InvoiceRowType::OutboundShipment;
            })
        }

        fn line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "line".to_string();
                r.invoice_id = invoice().id;
                r.item_id = mock_item_a().id;
                r.r#type = InvoiceLineRowType::UnallocatedStock;
                r.number_of_packs = 50;
                r.pack_size = 1;
            })
        }

        fn stock_line() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line".to_string();
                r.store_id = mock_store_a().id;
                r.item_id = mock_item_a().id;
                r.pack_size = 1;
                r.available_number_of_packs = 30;
                r.expiry_date = Some(NaiveDate::from_ymd(3021, 02, 01))
            })
        }

        fn allocated_line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "allocated_line".to_string();
                r.invoice_id = invoice().id;
                r.item_id = mock_item_a().id;
                r.stock_line_id = Some(stock_line().id);
                r.r#type = InvoiceLineRowType::StockOut;
                r.number_of_packs = 2;
                r.pack_size = 1;
            })
        }

        fn stock_line2() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line2".to_string();
                r.store_id = mock_store_a().id;
                r.item_id = mock_item_a().id;
                r.pack_size = 1;
                r.available_number_of_packs = 5;
            })
        }

        fn allocated_line2() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "allocated_line2".to_string();
                r.invoice_id = invoice().id;
                r.item_id = mock_item_a().id;
                r.stock_line_id = Some(stock_line2().id);
                r.r#type = InvoiceLineRowType::StockOut;
                r.number_of_packs = 10;
                r.pack_size = 1;
            })
        }

        fn stock_line3() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line3".to_string();
                r.store_id = mock_store_a().id;
                r.item_id = mock_item_a().id;
                r.pack_size = 1;
                r.available_number_of_packs = 100;
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "allocate_unallocated_line_add_to_existing_lines",
            MockDataInserts::none().stores().items().names().units(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice()];
                r.invoice_lines = vec![line(), allocated_line(), allocated_line2()];
                r.stock_lines = vec![stock_line(), stock_line2(), stock_line3()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        let result = service
            .allocate_outbound_shipment_unallocated_line(
                &context,
                &mock_store_a().id,
                line().id.clone(),
            )
            .unwrap();

        assert_eq!(result.inserts.len(), 1);
        assert_eq!(result.deletes.len(), 1);
        assert_eq!(result.updates.len(), 2);

        let update = result.updates[0].clone();
        assert_eq!(
            update,
            inline_edit(&update, |mut u| {
                u.invoice_line_row.id = allocated_line().id;
                u.invoice_line_row.number_of_packs = 32;
                u
            })
        );

        let update = result.updates[1].clone();
        assert_eq!(
            update,
            inline_edit(&update, |mut u| {
                u.invoice_line_row.id = allocated_line2().id;
                u.invoice_line_row.number_of_packs = 15;
                u
            })
        );

        let insert = result.inserts[0].clone();
        assert_eq!(
            insert,
            inline_edit(&insert, |mut u| {
                u.invoice_line_row.number_of_packs = 15;
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
                r.name_id = mock_name_a().id;
                r.r#type = InvoiceRowType::OutboundShipment;
            })
        }

        fn line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "line".to_string();
                r.invoice_id = invoice().id;
                r.item_id = mock_item_a().id;
                r.r#type = InvoiceLineRowType::UnallocatedStock;
                r.number_of_packs = 1;
                r.pack_size = 1;
            })
        }

        fn stock_line() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line".to_string();
                r.store_id = mock_store_a().id;
                r.item_id = mock_item_a().id;
                r.pack_size = 3;
                r.available_number_of_packs = 3;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "allocate_unallocated_line_round_up",
            MockDataInserts::none().stores().items().names().units(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice()];
                r.invoice_lines = vec![line()];
                r.stock_lines = vec![stock_line()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        let result = service
            .allocate_outbound_shipment_unallocated_line(
                &context,
                &mock_store_a().id,
                line().id.clone(),
            )
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
                u.number_of_packs = 1;
                u.pack_size = 3;
                u
            })
        );
    }
}
