use repository::{
    EqualFilter, Invoice, InvoiceFilter, InvoiceLineFilter, InvoiceLineRepository,
    InvoiceLineRowType, InvoiceRepository, InvoiceRowType, RepositoryError, StockLine,
    StockLineFilter, StockLineRepository,
};

use crate::service_provider::ServiceContext;

#[derive(Debug, PartialEq)]
pub struct Repack {
    pub invoice: Invoice,
    pub stock_from: StockLine,
    pub stock_to: StockLine,
}

pub fn get_repack(ctx: &ServiceContext, invoice_id: &str) -> Result<Repack, RepositoryError> {
    let connection = &ctx.connection;

    let invoice = InvoiceRepository::new(connection)
        .query_by_filter(
            InvoiceFilter::new()
                .id(EqualFilter::equal_to(invoice_id))
                .store_id(EqualFilter::equal_to(&ctx.store_id))
                .r#type(InvoiceRowType::Repack.equal_to()),
        )?
        .pop()
        .ok_or(RepositoryError::NotFound)?;

    let invoice_lines = InvoiceLineRepository::new(connection)
        .query_by_filter(InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(invoice_id)))?;

    let stock_from_id = invoice_lines
        .iter()
        .find_map(|line| {
            if line.invoice_line_row.r#type == InvoiceLineRowType::StockOut {
                line.stock_line_option
                    .as_ref()
                    .map(|stock_line| stock_line.id.clone())
            } else {
                None
            }
        })
        .ok_or(RepositoryError::NotFound)?;

    let stock_to_id = invoice_lines
        .iter()
        .find_map(|line| {
            if line.invoice_line_row.r#type == InvoiceLineRowType::StockIn {
                line.stock_line_option
                    .as_ref()
                    .map(|stock_line| stock_line.id.clone())
            } else {
                None
            }
        })
        .ok_or(RepositoryError::NotFound)?;

    let stock_from = StockLineRepository::new(connection)
        .query_by_filter(
            StockLineFilter::new().id(EqualFilter::equal_to(&stock_from_id)),
            Some(ctx.store_id.clone()),
        )?
        .pop()
        .ok_or(RepositoryError::NotFound)?;

    let stock_to = StockLineRepository::new(connection)
        .query_by_filter(
            StockLineFilter::new().id(EqualFilter::equal_to(&stock_to_id)),
            Some(ctx.store_id.clone()),
        )?
        .pop()
        .ok_or(RepositoryError::NotFound)?;

    Ok(Repack {
        invoice,
        stock_from,
        stock_to,
    })
}

#[cfg(test)]
mod test {
    use crate::service_provider::ServiceProvider;
    use chrono::Utc;
    use repository::{
        mock::{
            mock_item_a, mock_location_1, mock_stock_line_a, mock_stock_line_ci_c,
            mock_stock_line_si_d, mock_store_a, mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        EqualFilter, InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowRepository,
        InvoiceRowStatus, InvoiceRowType, LocationMovement, LocationMovementFilter,
        LocationMovementRepository, LocationMovementRow, StockLineRow,
    };
    use util::{inline_edit, inline_init};

    #[actix_rt::test]
    async fn query_repacks() {
        let invoice_a = InvoiceRow {
            id: "repack_invoice_a".to_string(),
            name_id: "name_store_a".to_string(),
            store_id: "store_a".to_string(),
            invoice_number: 10,
            r#type: InvoiceRowType::Repack,
            status: InvoiceRowStatus::Verified,
            created_datetime: Utc::now().naive_utc(),
            verified_datetime: Some(Utc::now().naive_utc()),
            ..Default::default()
        };

        let invoice_a_line_a = InvoiceLineRow {
            id: "invoice_a_line_a".to_string(),
            invoice_id: invoice_a.id,
            item_id: mock_item_a().id,
            item_name: mock_item_a().name,
            item_code: mock_item_a().code,
            stock_line_id: line_a_stock_line_a.id.to_string(),
            cost_price_per_pack: 10.0,
            sell_price_per_pack 20.0,
            
        };

        let line_a_stock_line_a = StockLineRow {
            id: "stock_line_a".to_string(),
            item_id: mock_item_a().id,
            store_id: mock_store_a().id.clone(),
            pack_size: 5,
            cost_price_per_pack: 10.0,
            sell_price_per_pack: 20.0,
            available_number_of_packs: 100.0,
            total_number_of_packs: 100.0,
            ..Default::default()
        };

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_repack_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice_a.clone()];
                r.stock_lines = vec![line_a_stock_line_a.clone()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id.to_string())
            .unwrap();
        let service = service_provider.repack_service;

        let invoice_repo = InvoiceRowRepository::new(&connection);

        // Repack increase where stock pack size == one
        let increased_pack_size = service
            .insert_repack(
                &context,
                inline_init(|r: &mut InsertRepack| {
                    r.stock_line_id = mock_stock_line_a().id.clone();
                    r.number_of_packs = 8.0;
                    r.new_pack_size = 2;
                }),
            )
            .unwrap();

        let invoice = invoice_repo
            .find_one_by_id(&increased_pack_size.invoice_row.id)
            .unwrap();

        let SortedInvoiceAndStock {
            in_line,
            out_line,
            updated_stock,
            new_stock,
        } = sort_invoice_lines(&connection, &invoice.id);

        // Check invoice lines have been generated correctly
        assert_eq!(
            in_line,
            InvoiceLineRow {
                id: in_line.id.clone(),
                invoice_id: invoice.id.clone(),
                item_id: "item_a".to_string(),
                item_name: "Item A".to_string(),
                item_code: "item_a_code".to_string(),
                stock_line_id: Some(new_stock.id.clone()),
                location_id: mock_stock_line_a().location_id,
                batch: mock_stock_line_a().batch,
                expiry_date: mock_stock_line_a().expiry_date,
                pack_size: 2,
                cost_price_per_pack: mock_stock_line_a().cost_price_per_pack * 2.0,
                sell_price_per_pack: mock_stock_line_a().sell_price_per_pack * 2.0,
                r#type: InvoiceLineRowType::StockIn,
                number_of_packs: 4.0,
                ..Default::default()
            }
        );
        assert_eq!(
            out_line,
            InvoiceLineRow {
                id: out_line.id.clone(),
                invoice_id: invoice.id.clone(),
                item_id: mock_stock_line_a().item_id,
                item_name: "Item A".to_string(),
                item_code: "item_a_code".to_string(),
                stock_line_id: Some(mock_stock_line_a().id),
                location_id: mock_stock_line_a().location_id,
                batch: mock_stock_line_a().batch,
                expiry_date: mock_stock_line_a().expiry_date,
                pack_size: mock_stock_line_a().pack_size,
                cost_price_per_pack: mock_stock_line_a().cost_price_per_pack,
                sell_price_per_pack: mock_stock_line_a().sell_price_per_pack,
                r#type: InvoiceLineRowType::StockOut,
                number_of_packs: 8.0,
                ..Default::default()
            }
        );

        // Check stock lines have been generated correctly
        assert_eq!(
            new_stock,
            StockLineRow {
                id: new_stock.id.clone(),
                item_id: mock_stock_line_a().item_id,
                store_id: mock_stock_line_a().store_id,
                supplier_id: mock_stock_line_a().supplier_id,
                available_number_of_packs: 4.0,
                total_number_of_packs: 4.0,
                pack_size: 2,
                cost_price_per_pack: mock_stock_line_a().cost_price_per_pack * 2.0,
                sell_price_per_pack: mock_stock_line_a().sell_price_per_pack * 2.0,
                ..Default::default()
            }
        );
        assert_eq!(
            updated_stock,
            StockLineRow {
                available_number_of_packs: mock_stock_line_a().available_number_of_packs - 8.0,
                total_number_of_packs: mock_stock_line_a().total_number_of_packs - 8.0,
                ..mock_stock_line_a()
            }
        );

        // Repack increase where size != 1
        let increased_pack_size = service
            .insert_repack(
                &context,
                inline_init(|r: &mut InsertRepack| {
                    r.stock_line_id = stock_line_a.id.clone();
                    r.number_of_packs = 6.0;
                    r.new_pack_size = 6;
                }),
            )
            .unwrap();

        let invoice = invoice_repo
            .find_one_by_id(&increased_pack_size.invoice_row.id)
            .unwrap();

        let SortedInvoiceAndStock {
            in_line: _,
            out_line: _,
            updated_stock,
            new_stock,
        } = sort_invoice_lines(&connection, &invoice.id);

        let difference = 6.0 / stock_line_a.pack_size as f64;

        assert_eq!(
            new_stock,
            StockLineRow {
                id: new_stock.id.clone(),
                available_number_of_packs: 5.0,
                total_number_of_packs: 5.0,
                pack_size: 6,
                cost_price_per_pack: stock_line_a.cost_price_per_pack * difference,
                sell_price_per_pack: stock_line_a.sell_price_per_pack * difference,
                ..stock_line_a.clone()
            }
        );
        assert_eq!(
            updated_stock,
            StockLineRow {
                available_number_of_packs: 94.0,
                total_number_of_packs: 94.0,
                ..stock_line_a
            }
        );

        // Repack all
        let repack_all = service
            .insert_repack(
                &context,
                inline_init(|r: &mut InsertRepack| {
                    r.stock_line_id = mock_stock_line_a().id.clone();
                    r.number_of_packs = 22.0;
                    r.new_pack_size = 11;
                }),
            )
            .unwrap();

        let invoice = invoice_repo
            .find_one_by_id(&repack_all.invoice_row.id)
            .unwrap();

        let SortedInvoiceAndStock {
            in_line: _,
            out_line: _,
            updated_stock,
            new_stock,
        } = sort_invoice_lines(&connection, &invoice.id);

        let difference = 11.0 / mock_stock_line_a().pack_size as f64;

        assert_eq!(
            new_stock,
            StockLineRow {
                id: new_stock.id.clone(),
                available_number_of_packs: 2.0,
                total_number_of_packs: 2.0,
                pack_size: 11,
                cost_price_per_pack: mock_stock_line_a().cost_price_per_pack * difference,
                sell_price_per_pack: mock_stock_line_a().sell_price_per_pack * difference,
                ..mock_stock_line_a()
            }
        );
        assert_eq!(
            updated_stock,
            StockLineRow {
                available_number_of_packs: 0.0,
                total_number_of_packs: 10.0,
                ..mock_stock_line_a()
            }
        );

        // Repack stock line to one
        let decreased_pack_size_to_one = service
            .insert_repack(
                &context,
                inline_init(|r: &mut InsertRepack| {
                    r.stock_line_id = mock_stock_line_si_d()[1].id.clone();
                    r.number_of_packs = 1.0;
                    r.new_pack_size = 1;
                }),
            )
            .unwrap();

        let invoice = invoice_repo
            .find_one_by_id(&decreased_pack_size_to_one.invoice_row.id)
            .unwrap();

        let SortedInvoiceAndStock {
            in_line: _,
            out_line: _,
            updated_stock,
            new_stock,
        } = sort_invoice_lines(&connection, &invoice.id);

        assert_eq!(
            inline_edit(&new_stock, |mut s| {
                s.sell_price_per_pack =
                    (mock_stock_line_si_d()[1].sell_price_per_pack / 3.0).round();
                s
            }),
            StockLineRow {
                id: new_stock.id.clone(),
                available_number_of_packs: 3.0,
                total_number_of_packs: 3.0,
                pack_size: 1,
                cost_price_per_pack: mock_stock_line_si_d()[1].cost_price_per_pack / 3.0,
                sell_price_per_pack: (mock_stock_line_si_d()[1].sell_price_per_pack / 3.0).round(),
                ..mock_stock_line_si_d()[1].clone()
            }
        );
        assert_eq!(
            updated_stock,
            StockLineRow {
                available_number_of_packs: 1.0,
                total_number_of_packs: 1.0,
                ..mock_stock_line_si_d()[1].clone()
            }
        );

        // Repack stock line with location
        let decreased_pack_size = service
            .insert_repack(
                &context,
                inline_init(|r: &mut InsertRepack| {
                    r.stock_line_id = mock_stock_line_ci_c()[1].id.clone();
                    r.number_of_packs = 3.0;
                    r.new_pack_size = 3;
                    r.new_location_id = Some(mock_location_1().id);
                }),
            )
            .unwrap();

        let invoice = invoice_repo
            .find_one_by_id(&decreased_pack_size.invoice_row.id)
            .unwrap();

        let SortedInvoiceAndStock {
            in_line: _,
            out_line: _,
            updated_stock,
            new_stock,
        } = sort_invoice_lines(&connection, &invoice.id);
        let difference = 3.0 / mock_stock_line_ci_c()[1].pack_size as f64;

        assert_eq!(
            new_stock,
            StockLineRow {
                id: new_stock.id.clone(),
                location_id: Some(mock_location_1().id),
                available_number_of_packs: 7.0,
                total_number_of_packs: 7.0,
                pack_size: 3,
                cost_price_per_pack: mock_stock_line_ci_c()[1].cost_price_per_pack * difference,
                sell_price_per_pack: mock_stock_line_ci_c()[1].sell_price_per_pack * difference,
                ..mock_stock_line_ci_c()[1].clone()
            }
        );
        assert_eq!(
            updated_stock,
            StockLineRow {
                available_number_of_packs: 17.0,
                total_number_of_packs: 18.0,
                ..mock_stock_line_ci_c()[1].clone()
            }
        );

        let enter_location_movement = LocationMovementRepository::new(&connection)
            .query_by_filter(
                LocationMovementFilter::new().stock_line_id(EqualFilter::equal_to(&new_stock.id)),
            )
            .unwrap()
            .pop()
            .unwrap();
        assert_eq!(
            enter_location_movement,
            LocationMovement {
                location_movement_row: LocationMovementRow {
                    id: enter_location_movement.location_movement_row.id.clone(),
                    store_id: mock_store_a().id.clone(),
                    stock_line_id: new_stock.id.clone(),
                    location_id: Some(mock_location_1().id.clone()),
                    enter_datetime: enter_location_movement.location_movement_row.enter_datetime,
                    ..Default::default()
                }
            }
        );

        let exit_location_movement = LocationMovementRepository::new(&connection)
            .query_by_filter(
                LocationMovementFilter::new()
                    .stock_line_id(EqualFilter::equal_to(&updated_stock.id)),
            )
            .unwrap()
            .pop()
            .unwrap();

        assert_eq!(
            exit_location_movement,
            LocationMovement {
                location_movement_row: LocationMovementRow {
                    id: exit_location_movement.location_movement_row.id.clone(),
                    store_id: mock_store_a().id.clone(),
                    stock_line_id: updated_stock.id.clone(),
                    exit_datetime: exit_location_movement.location_movement_row.exit_datetime,
                    ..Default::default()
                }
            }
        );
    }
}
