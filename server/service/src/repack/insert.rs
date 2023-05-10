use repository::{
    EqualFilter, Invoice, InvoiceFilter, InvoiceLineRowRepository, InvoiceRepository,
    InvoiceRowRepository, LocationMovementRowRepository, RepositoryError, StockLine,
    StockLineRowRepository,
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
    pub new_pack_size: i32,
    pub new_location_id: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum InsertRepackError {
    StockLineDoesNotExist,
    NotThisStoreStockLine,
    CannotHaveFractionalRepack,
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

            if let Some(movements) = location_movement {
                let location_movement_repo = LocationMovementRowRepository::new(connection);
                for movement in movements {
                    location_movement_repo.upsert_one(&movement)?;
                }
            }

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
        mock::{
            mock_item_b_lines, mock_location_1, mock_stock_line_a, mock_stock_line_b,
            mock_stock_line_ci_c, mock_stock_line_si_d, mock_store_a, mock_user_account_a,
            MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        EqualFilter, InvoiceLineRowRepository, InvoiceRowRepository, LocationMovement,
        LocationMovementFilter, LocationMovementRepository, StockLineFilter, StockLineRepository,
        StockLineRow, StockLineRowRepository,
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
                    r.stock_line_id = mock_item_b_lines()[0].id.clone();
                })
            ),
            Err(ServiceError::NotThisStoreStockLine)
        );

        // CannotHaveFractionalRepack
        assert_eq!(
            service.insert_repack(
                &context,
                inline_init(|r: &mut InsertRepack| {
                    r.stock_line_id = mock_stock_line_a().id.clone();
                    r.number_of_packs = 9.0;
                    r.new_pack_size = 2;
                })
            ),
            Err(ServiceError::CannotHaveFractionalRepack)
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
                    r.stock_line_id = mock_stock_line_b().id.clone();
                    r.number_of_packs = 40.0;
                    r.new_pack_size = 2;
                })
            ),
            Err(ServiceError::StockLineReducedBelowZero(stock_line))
        );
    }

    #[actix_rt::test]
    async fn insert_repack_success() {
        let stock_line_a = StockLineRow {
            id: "stock_line_a".to_string(),
            item_id: "item_a".to_string(),
            store_id: mock_store_a().id.clone(),
            pack_size: 5,
            cost_price_per_pack: 0.20,
            sell_price_per_pack: 0.50,
            available_number_of_packs: 100.0,
            total_number_of_packs: 100.0,
            ..Default::default()
        };

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
        let invoice_line_repo = InvoiceLineRowRepository::new(&connection);
        let stock_line_repo = StockLineRowRepository::new(&connection);

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
        let invoice_lines = invoice_line_repo
            .find_many_by_invoice_id(&invoice.id)
            .unwrap();

        let stock_line_ids: Vec<String> = invoice_lines
            .iter()
            .map(|line| line.stock_line_id.clone().unwrap())
            .collect();
        let stock_lines = stock_line_repo.find_many_by_ids(&stock_line_ids).unwrap();

        assert_eq!(invoice_lines.len(), 2);
        // New stock line
        assert_eq!(
            stock_lines[0],
            inline_init(|s: &mut StockLineRow| {
                s.id = stock_lines[0].id.clone();
                s.item_id = mock_stock_line_a().item_id.clone();
                s.store_id = mock_stock_line_a().store_id.clone();
                s.supplier_id = mock_stock_line_a().supplier_id.clone();
                s.available_number_of_packs = 4.0;
                s.total_number_of_packs = 4.0;
                s.pack_size = 2;
                s.cost_price_per_pack = mock_stock_line_a().cost_price_per_pack * 2.0;
                s.sell_price_per_pack = mock_stock_line_a().sell_price_per_pack * 2.0;
            })
        );
        assert_eq!(
            stock_lines[1],
            inline_edit(&mock_stock_line_a(), |mut s| {
                s.available_number_of_packs = 22.0;
                s.total_number_of_packs = 32.0;
                s
            })
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
        let invoice_lines = invoice_line_repo
            .find_many_by_invoice_id(&invoice.id)
            .unwrap();

        let stock_line_ids: Vec<String> = invoice_lines
            .iter()
            .map(|line| line.stock_line_id.clone().unwrap())
            .collect();
        let stock_lines = stock_line_repo.find_many_by_ids(&stock_line_ids).unwrap();
        let difference = 6.0 / stock_line_a.pack_size as f64;

        // New stock line
        assert_eq!(
            stock_lines[0],
            inline_init(|s: &mut StockLineRow| {
                s.id = stock_lines[0].id.clone();
                s.item_id = stock_line_a.item_id.clone();
                s.store_id = stock_line_a.store_id.clone();
                s.supplier_id = stock_line_a.supplier_id.clone();
                s.available_number_of_packs = 5.0;
                s.total_number_of_packs = 5.0;
                s.pack_size = 6;
                s.cost_price_per_pack = stock_line_a.cost_price_per_pack * difference;
                s.sell_price_per_pack = stock_line_a.sell_price_per_pack * difference;
            })
        );
        assert_eq!(
            stock_lines[1],
            inline_edit(&stock_line_a, |mut s| {
                s.available_number_of_packs = 94.0;
                s.total_number_of_packs = 94.0;
                s
            })
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
        let invoice_lines = invoice_line_repo
            .find_many_by_invoice_id(&invoice.id)
            .unwrap();

        let stock_line_ids: Vec<String> = invoice_lines
            .iter()
            .map(|line| line.stock_line_id.clone().unwrap())
            .collect();
        let stock_lines = stock_line_repo.find_many_by_ids(&stock_line_ids).unwrap();
        let difference = 11.0 / mock_stock_line_a().pack_size as f64;

        assert_eq!(
            stock_lines[0],
            inline_init(|s: &mut StockLineRow| {
                s.id = stock_lines[0].id.clone();
                s.item_id = mock_stock_line_a().item_id.clone();
                s.store_id = mock_stock_line_a().store_id.clone();
                s.supplier_id = mock_stock_line_a().supplier_id.clone();
                s.available_number_of_packs = 2.0;
                s.total_number_of_packs = 2.0;
                s.pack_size = 11;
                s.cost_price_per_pack = mock_stock_line_a().cost_price_per_pack * difference;
                s.sell_price_per_pack = mock_stock_line_a().sell_price_per_pack * difference;
            })
        );
        assert_eq!(
            stock_lines[1],
            inline_edit(&mock_stock_line_a(), |mut s| {
                s.available_number_of_packs = 0.0;
                s.total_number_of_packs = 10.0;
                s
            })
        );

        // Repack stock line to one
        let decreased_pack_size_to_one = service
            .insert_repack(
                &context,
                inline_init(|r: &mut InsertRepack| {
                    r.stock_line_id = mock_stock_line_si_d()[1].id.clone();
                    r.number_of_packs = 2.0;
                    r.new_pack_size = 1;
                }),
            )
            .unwrap();

        let invoice = invoice_repo
            .find_one_by_id(&decreased_pack_size_to_one.invoice_row.id)
            .unwrap();
        let invoice_lines = invoice_line_repo
            .find_many_by_invoice_id(&invoice.id)
            .unwrap();

        let stock_line_ids: Vec<String> = invoice_lines
            .iter()
            .map(|line| line.stock_line_id.clone().unwrap())
            .collect();
        let stock_lines = stock_line_repo.find_many_by_ids(&stock_line_ids).unwrap();

        assert_eq!(
            stock_lines[0],
            inline_init(|s: &mut StockLineRow| {
                s.id = stock_lines[0].id.clone();
                s.item_id = mock_stock_line_si_d()[1].item_id.clone();
                s.store_id = mock_stock_line_si_d()[1].store_id.clone();
                s.supplier_id = mock_stock_line_si_d()[1].supplier_id.clone();
                s.batch = mock_stock_line_si_d()[1].batch.clone();
                s.expiry_date = mock_stock_line_si_d()[1].expiry_date.clone();
                s.available_number_of_packs = 3.0;
                s.total_number_of_packs = 3.0;
                s.pack_size = 1;
                s.cost_price_per_pack = mock_stock_line_si_d()[1].cost_price_per_pack / 3.0;
                s.sell_price_per_pack = mock_stock_line_si_d()[1].sell_price_per_pack / 3.0;
            })
        );

        assert_eq!(
            stock_lines[1],
            inline_edit(&mock_stock_line_si_d()[1], |mut s| {
                s.available_number_of_packs = 1.0;
                s.total_number_of_packs = 1.0;
                s
            })
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
        let invoice_lines = invoice_line_repo
            .find_many_by_invoice_id(&invoice.id)
            .unwrap();

        let stock_line_ids: Vec<String> = invoice_lines
            .iter()
            .map(|line| line.stock_line_id.clone().unwrap())
            .collect();
        let stock_lines = stock_line_repo.find_many_by_ids(&stock_line_ids).unwrap();
        let difference = 3.0 / mock_stock_line_ci_c()[1].pack_size as f64;

        assert_eq!(
            stock_lines[0],
            inline_init(|s: &mut StockLineRow| {
                s.id = stock_lines[0].id.clone();
                s.item_id = mock_stock_line_ci_c()[1].item_id.clone();
                s.store_id = mock_stock_line_ci_c()[1].store_id.clone();
                s.supplier_id = mock_stock_line_ci_c()[1].supplier_id.clone();
                s.batch = mock_stock_line_ci_c()[1].batch.clone();
                s.expiry_date = mock_stock_line_ci_c()[1].expiry_date.clone();
                s.available_number_of_packs = 7.0;
                s.total_number_of_packs = 7.0;
                s.pack_size = 3;
                s.cost_price_per_pack = mock_stock_line_ci_c()[1].cost_price_per_pack * difference;
                s.sell_price_per_pack = mock_stock_line_ci_c()[1].sell_price_per_pack * difference;
                s.location_id = Some(mock_location_1().id.clone());
            })
        );
        assert_eq!(
            stock_lines[1],
            inline_edit(&mock_stock_line_ci_c()[1], |mut s| {
                s.available_number_of_packs = 17.0;
                s.total_number_of_packs = 18.0;
                s
            })
        );

        let enter_location_movement = LocationMovementRepository::new(&connection)
            .query_by_filter(
                LocationMovementFilter::new()
                    .stock_line_id(EqualFilter::equal_to(&stock_lines[0].id)),
            )
            .unwrap()
            .pop()
            .unwrap();
        assert_eq!(
            enter_location_movement,
            inline_init(|l: &mut LocationMovement| {
                l.location_movement_row.id =
                    enter_location_movement.location_movement_row.id.clone();
                l.location_movement_row.store_id = mock_store_a().id.clone();
                l.location_movement_row.location_id = Some(mock_location_1().id.clone());
                l.location_movement_row.stock_line_id = stock_lines[0].id.clone();
                l.location_movement_row.enter_datetime =
                    enter_location_movement.location_movement_row.enter_datetime;
            })
        );

        let exit_location_movement = LocationMovementRepository::new(&connection)
            .query_by_filter(
                LocationMovementFilter::new()
                    .stock_line_id(EqualFilter::equal_to(&stock_lines[1].id)),
            )
            .unwrap()
            .pop()
            .unwrap();

        assert_eq!(
            exit_location_movement,
            inline_init(|l: &mut LocationMovement| {
                l.location_movement_row.id =
                    exit_location_movement.location_movement_row.id.clone();
                l.location_movement_row.store_id = mock_store_a().id.clone();
                l.location_movement_row.stock_line_id = stock_lines[1].id.clone();
                l.location_movement_row.exit_datetime =
                    exit_location_movement.location_movement_row.exit_datetime;
            })
        );
    }
}
