use repository::{
    ActivityLogRowRepository, EqualFilter, Invoice, InvoiceFilter, InvoiceLineRowRepository,
    InvoiceRepository, InvoiceRowRepository, LocationMovementRowRepository, RepositoryError,
    StockLine, StockLineRowRepository,
};

use crate::service_provider::ServiceContext;

use super::{
    generate::{generate, GenerateRepack},
    validate,
};

#[derive(Default)]
pub struct InsertRepack {
    pub stock_line_id: String,
    pub number_of_packs: f64,
    pub new_pack_size: f64,
    pub new_location_id: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum InsertRepackError {
    StockLineDoesNotExist,
    NotThisStoreStockLine,
    CannotHaveFractionalPack,
    NewlyCreatedInvoiceDoesNotExist,
    StockLineReducedBelowZero(StockLine),
    DatabaseError(RepositoryError),
    InternalError(String),
}

pub fn insert_repack(
    ctx: &ServiceContext,
    input: InsertRepack,
) -> Result<Invoice, InsertRepackError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            let stock_line = validate(connection, &ctx.store_id, &input)?;
            let GenerateRepack {
                repack_invoice,
                repack_invoice_lines,
                stock_lines,
                location_movement,
                activity_log,
            } = generate(ctx, stock_line, input)?;

            let stock_line_repo = StockLineRowRepository::new(connection);

            for line in stock_lines {
                stock_line_repo.upsert_one(&line)?;
            }

            let invoice_repo = InvoiceRowRepository::new(connection);
            invoice_repo.upsert_one(&repack_invoice)?;

            let invoice_line_repo = InvoiceLineRowRepository::new(connection);
            for line in repack_invoice_lines {
                invoice_line_repo.upsert_one(&line)?;
            }

            if let Some(movement) = location_movement {
                LocationMovementRowRepository::new(connection).upsert_one(&movement)?;
            }

            ActivityLogRowRepository::new(connection).insert_one(&activity_log)?;

            InvoiceRepository::new(connection)
                .query_by_filter(
                    InvoiceFilter::new()
                        .id(EqualFilter::equal_to(&repack_invoice.id))
                        .store_id(EqualFilter::equal_to(&ctx.store_id)),
                )?
                .pop()
                .ok_or(InsertRepackError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(result)
}

impl From<RepositoryError> for InsertRepackError {
    fn from(error: RepositoryError) -> Self {
        InsertRepackError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use crate::service_provider::ServiceProvider;
    use repository::{
        activity_log::{ActivityLog, ActivityLogFilter, ActivityLogRepository},
        location_movement::{LocationMovement, LocationMovementFilter, LocationMovementRepository},
        mock::{
            mock_item_b_lines, mock_location_1, mock_stock_line_a, mock_stock_line_b,
            mock_stock_line_ci_c, mock_stock_line_si_d, mock_store_a, mock_user_account_a,
            MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        ActivityLogRow, ActivityLogType, EqualFilter, InvoiceLineFilter, InvoiceLineRepository,
        InvoiceLineRow, InvoiceLineType, InvoiceRowRepository, LocationMovementRow,
        StockLineFilter, StockLineRepository, StockLineRow, StorageConnection,
    };
    use util::{inline_edit, inline_init};

    use super::{InsertRepack, InsertRepackError};
    type ServiceError = InsertRepackError;

    #[actix_rt::test]
    async fn insert_repack_errors() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_repack_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id.to_string())
            .unwrap();
        let service = service_provider.repack_service;

        // StockLineDoesNotExist
        assert_eq!(
            service.insert_repack(
                &context,
                inline_init(|r: &mut InsertRepack| {
                    r.stock_line_id = "invalid".to_string();
                })
            ),
            Err(ServiceError::StockLineDoesNotExist)
        );

        // NotThisStoreStockLine
        assert_eq!(
            service.insert_repack(
                &context,
                inline_init(|r: &mut InsertRepack| {
                    r.stock_line_id.clone_from(&mock_item_b_lines()[0].id);
                })
            ),
            Err(ServiceError::NotThisStoreStockLine)
        );

        // CannotHaveFractionalPack
        assert_eq!(
            service.insert_repack(
                &context,
                inline_init(|r: &mut InsertRepack| {
                    r.stock_line_id.clone_from(&mock_stock_line_a().id);
                    r.number_of_packs = 9.0;
                    r.new_pack_size = 2.0;
                })
            ),
            Err(ServiceError::CannotHaveFractionalPack)
        );

        // StockLineReducedBelowZero
        let stock_line = StockLineRepository::new(&connection)
            .query_by_filter(
                StockLineFilter::new().id(EqualFilter::equal_to(&mock_stock_line_b().id)),
                None,
            )
            .unwrap()
            .pop()
            .unwrap();
        assert_eq!(
            service.insert_repack(
                &context,
                inline_init(|r: &mut InsertRepack| {
                    r.stock_line_id.clone_from(&mock_stock_line_b().id);
                    r.number_of_packs = 40.0;
                    r.new_pack_size = 2.0;
                })
            ),
            Err(ServiceError::StockLineReducedBelowZero(stock_line))
        );
    }

    #[actix_rt::test]
    async fn insert_repack_success() {
        struct SortedInvoiceAndStock {
            in_line: InvoiceLineRow,
            out_line: InvoiceLineRow,
            updated_stock: StockLineRow,
            new_stock: StockLineRow,
        }

        let stock_line_a = StockLineRow {
            id: "stock_line_a".to_string(),
            item_link_id: "item_a".to_string(),
            store_id: mock_store_a().id.clone(),
            pack_size: 5.0,
            cost_price_per_pack: 0.20,
            sell_price_per_pack: 0.50,
            available_number_of_packs: 100.0,
            total_number_of_packs: 100.0,
            ..Default::default()
        };

        fn sort_invoice_lines(
            connection: &StorageConnection,
            invoice_id: &str,
        ) -> SortedInvoiceAndStock {
            let invoice_lines = InvoiceLineRepository::new(connection)
                .query_by_filter(
                    InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(invoice_id)),
                )
                .unwrap();

            let (in_line, out_line) =
                if invoice_lines[0].invoice_line_row.r#type == InvoiceLineType::StockIn {
                    (invoice_lines[0].clone(), invoice_lines[1].clone())
                } else {
                    (invoice_lines[1].clone(), invoice_lines[0].clone())
                };

            let (new_stock, updated_stock) = (
                in_line.stock_line_option.clone().unwrap(),
                out_line.stock_line_option.clone().unwrap(),
            );

            SortedInvoiceAndStock {
                in_line: in_line.invoice_line_row,
                out_line: out_line.invoice_line_row,
                updated_stock,
                new_stock,
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_repack_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.stock_lines = vec![stock_line_a.clone()];
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
                    r.stock_line_id.clone_from(&mock_stock_line_a().id);
                    r.number_of_packs = 8.0;
                    r.new_pack_size = 2.0;
                }),
            )
            .unwrap();

        let invoice = invoice_repo
            .find_one_by_id(&increased_pack_size.invoice_row.id)
            .unwrap()
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
                item_link_id: "item_a".to_string(),
                item_name: "Item A".to_string(),
                item_code: "item_a_code".to_string(),
                stock_line_id: Some(new_stock.id.clone()),
                location_id: mock_stock_line_a().location_id,
                batch: mock_stock_line_a().batch,
                expiry_date: mock_stock_line_a().expiry_date,
                pack_size: 2.0,
                cost_price_per_pack: mock_stock_line_a().cost_price_per_pack * 2.0,
                sell_price_per_pack: mock_stock_line_a().sell_price_per_pack * 2.0,
                total_before_tax: (mock_stock_line_a().cost_price_per_pack * 2.0) * 4.0,
                total_after_tax: (mock_stock_line_a().cost_price_per_pack * 2.0) * 4.0,
                r#type: InvoiceLineType::StockIn,
                number_of_packs: 4.0,
                ..Default::default()
            }
        );
        assert_eq!(
            out_line,
            InvoiceLineRow {
                id: out_line.id.clone(),
                invoice_id: invoice.id.clone(),
                item_link_id: mock_stock_line_a().item_link_id,
                item_name: "Item A".to_string(),
                item_code: "item_a_code".to_string(),
                stock_line_id: Some(mock_stock_line_a().id),
                location_id: mock_stock_line_a().location_id,
                batch: mock_stock_line_a().batch,
                expiry_date: mock_stock_line_a().expiry_date,
                pack_size: mock_stock_line_a().pack_size,
                cost_price_per_pack: mock_stock_line_a().cost_price_per_pack,
                sell_price_per_pack: mock_stock_line_a().sell_price_per_pack,
                total_after_tax: mock_stock_line_a().cost_price_per_pack * 8.0,
                total_before_tax: mock_stock_line_a().cost_price_per_pack * 8.0,
                r#type: InvoiceLineType::StockOut,
                number_of_packs: 8.0,
                ..Default::default()
            }
        );

        // Check stock lines have been generated correctly
        assert_eq!(
            new_stock,
            StockLineRow {
                id: new_stock.id.clone(),
                item_link_id: mock_stock_line_a().item_link_id,
                store_id: mock_stock_line_a().store_id,
                supplier_link_id: mock_stock_line_a().supplier_link_id,
                available_number_of_packs: 4.0,
                total_number_of_packs: 4.0,
                pack_size: 2.0,
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
                    r.stock_line_id.clone_from(&stock_line_a.id);
                    r.number_of_packs = 6.0;
                    r.new_pack_size = 6.0;
                }),
            )
            .unwrap();

        let invoice = invoice_repo
            .find_one_by_id(&increased_pack_size.invoice_row.id)
            .unwrap()
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
                pack_size: 6.0,
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
                    r.stock_line_id.clone_from(&mock_stock_line_a().id);
                    r.number_of_packs = 22.0;
                    r.new_pack_size = 11.0;
                }),
            )
            .unwrap();

        let invoice = invoice_repo
            .find_one_by_id(&repack_all.invoice_row.id)
            .unwrap()
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
                pack_size: 11.0,
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
                    r.stock_line_id.clone_from(&mock_stock_line_si_d()[1].id);
                    r.number_of_packs = 1.0;
                    r.new_pack_size = 1.0;
                }),
            )
            .unwrap();

        let invoice = invoice_repo
            .find_one_by_id(&decreased_pack_size_to_one.invoice_row.id)
            .unwrap()
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
                pack_size: 1.0,
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
                    r.stock_line_id.clone_from(&mock_stock_line_ci_c()[1].id);
                    r.number_of_packs = 3.0;
                    r.new_pack_size = 3.0;
                    r.new_location_id = Some(mock_location_1().id);
                }),
            )
            .unwrap();

        let invoice = invoice_repo
            .find_one_by_id(&decreased_pack_size.invoice_row.id)
            .unwrap()
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
                pack_size: 3.0,
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

        let activity_log = ActivityLogRepository::new(&connection)
            .query_by_filter(
                ActivityLogFilter::new().record_id(EqualFilter::equal_to(&new_stock.id)),
            )
            .unwrap()
            .pop()
            .unwrap();
        assert_eq!(
            activity_log,
            ActivityLog {
                activity_log_row: ActivityLogRow {
                    id: activity_log.activity_log_row.id.clone(),
                    store_id: Some(mock_store_a().id.clone()),
                    user_id: Some(mock_user_account_a().id.clone()),
                    r#type: ActivityLogType::Repack,
                    record_id: Some(new_stock.id.clone()),
                    datetime: activity_log.activity_log_row.datetime,
                    changed_from: Some(updated_stock.id),
                    changed_to: None
                }
            }
        )
    }
}
