mod validate;
use validate::validate;

mod generate;
use generate::*;

use chrono::{NaiveDate, Utc};
use repository::{
    ActivityLogType, InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository, InvoiceStatus,
    LocationMovementRowRepository, RepositoryError, StockLine, StockLineRowRepository, Stocktake,
    StocktakeLine, StocktakeLineRowRepository, StocktakeRowRepository,
};

use crate::{
    activity_log::activity_log_entry,
    invoice_line::{
        stock_in_line::{insert_stock_in_line, InsertStockInLineError},
        stock_out_line::{insert_stock_out_line, InsertStockOutLineError},
    },
    service_provider::ServiceContext,
    stocktake::query::get_stocktake,
};

#[derive(Debug, Clone)]
pub enum UpdateStocktakeStatus {
    Finalised,
}

impl Default for UpdateStocktakeStatus {
    fn default() -> Self {
        Self::Finalised
    }
}

#[derive(Default, Debug, Clone)]
pub struct UpdateStocktake {
    pub id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub status: Option<UpdateStocktakeStatus>,
    pub stocktake_date: Option<NaiveDate>,
    pub is_locked: Option<bool>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateStocktakeError {
    DatabaseError(RepositoryError),
    InternalError(String),
    InvalidStore,
    StocktakeDoesNotExist,
    CannotEditFinalised,
    StocktakeIsLocked,
    InsertStockInLineError {
        line_id: String,
        error: InsertStockInLineError,
    },
    InsertStockOutLineError {
        line_id: String,
        error: InsertStockOutLineError,
    },
    /// Stocktakes doesn't contain any lines
    NoLines,
    /// Holds list of affected stock lines
    SnapshotCountCurrentCountMismatch(Vec<StocktakeLine>),
    StockLinesReducedBelowZero(Vec<StockLine>),
}

pub fn update_stocktake(
    ctx: &ServiceContext,
    input: UpdateStocktake,
) -> Result<Stocktake, UpdateStocktakeError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            let stocktake_id = input.id.clone();
            let (existing, stocktake_lines, status_changed) =
                validate(connection, &ctx.store_id, &input)?;
            let result = generate(ctx, input, existing, stocktake_lines, status_changed)?;

            // write data to the DB
            let stock_line_repo = StockLineRowRepository::new(connection);
            let stocktake_line_repo = StocktakeLineRowRepository::new(connection);
            let invoice_row_repo = InvoiceRowRepository::new(connection);
            let invoice_line_repo = InvoiceLineRowRepository::new(connection);

            // write updated stock lines (stock line info has changed, but no inventory adjustment)
            for stock_line in result.stock_lines {
                stock_line_repo.upsert_one(&stock_line)?;
            }
            // write inventory adjustment
            if let Some(inventory_addition) = result.inventory_addition.clone() {
                invoice_row_repo.upsert_one(&inventory_addition)?;
            }
            if let Some(inventory_reduction) = result.inventory_reduction.clone() {
                invoice_row_repo.upsert_one(&inventory_reduction)?;
            }
            // write inventory adjustment lines (and update/introduce stock)
            for line in result.inventory_addition_lines {
                let line_id = line.id.clone();
                insert_stock_in_line(ctx, line).map_err(|error| {
                    UpdateStocktakeError::InsertStockInLineError { line_id, error }
                })?;
            }
            for line in result.inventory_reduction_lines {
                let line_id = line.id.clone();
                insert_stock_out_line(ctx, line).map_err(|error| {
                    UpdateStocktakeError::InsertStockOutLineError { line_id, error }
                })?;
            }
            // Add inventory adjustment reasons to the invoice lines
            for update_reason in result.inventory_adjustment_reason_updates {
                invoice_line_repo.update_inventory_adjustment_reason_id(
                    &update_reason.invoice_line_id,
                    update_reason.reason_id,
                )?;
            }
            // write updated stocktake lines (update with stock_line_ids for newly created stock lines)
            for stocktake_line in result.stocktake_lines {
                stocktake_line_repo.upsert_one(&stocktake_line)?;
            }

            // Set inventory adjustment invoices to Verified after all lines have been added
            if let Some(inventory_addition) = result.inventory_addition {
                let verified_addition = InvoiceRow {
                    status: InvoiceStatus::Verified,
                    verified_datetime: Some(Utc::now().naive_utc()),
                    ..inventory_addition
                };
                invoice_row_repo.upsert_one(&verified_addition)?;
            }
            if let Some(inventory_reduction) = result.inventory_reduction {
                let verified_reduction = InvoiceRow {
                    status: InvoiceStatus::Verified,
                    verified_datetime: Some(Utc::now().naive_utc()),
                    ..inventory_reduction
                };
                invoice_row_repo.upsert_one(&verified_reduction)?;
            }

            StocktakeRowRepository::new(connection).upsert_one(&result.stocktake)?;
            // trim uncounted stocktake lines
            if let Some(lines_to_trim) = result.stocktake_lines_to_trim {
                for line in lines_to_trim {
                    stocktake_line_repo.delete(&line.id)?;
                }
            }

            if let Some(location_movements) = result.location_movements {
                let location_movement_repo = LocationMovementRowRepository::new(connection);
                for location_movement in location_movements {
                    location_movement_repo.upsert_one(&location_movement)?;
                }
            }

            if status_changed {
                activity_log_entry(
                    ctx,
                    ActivityLogType::StocktakeStatusFinalised,
                    Some(stocktake_id.to_owned()),
                    None,
                    None,
                )?;
            }

            // return the updated stocktake
            let stocktake = get_stocktake(ctx, stocktake_id)?;
            stocktake.ok_or(UpdateStocktakeError::InternalError(
                "Failed to read the just updated stocktake!".to_string(),
            ))
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(result)
}

#[cfg(test)]
mod test {
    use chrono::NaiveDate;
    use repository::{
        mock::{
            mock_item_a, mock_locked_stocktake, mock_stock_line_a, mock_stock_line_b,
            mock_stocktake_a, mock_stocktake_finalised_without_lines, mock_stocktake_full_edit,
            mock_stocktake_line_a, mock_stocktake_line_new_stock_line,
            mock_stocktake_line_stock_deficit, mock_stocktake_line_stock_surplus,
            mock_stocktake_new_stock_line, mock_stocktake_no_count_change, mock_stocktake_no_lines,
            mock_stocktake_stock_deficit, mock_stocktake_stock_surplus, mock_store_a, MockData,
            MockDataInserts,
        },
        test_db::setup_all_with_data,
        EqualFilter, InvoiceLineRepository, InvoiceLineRowRepository, InvoiceLineType,
        StockLineRow, StockLineRowRepository, StocktakeLine, StocktakeLineFilter,
        StocktakeLineRepository, StocktakeLineRow, StocktakeLineRowRepository, StocktakeRepository,
        StocktakeRow, StocktakeStatus,
    };
    use util::{constants::INVENTORY_ADJUSTMENT_NAME_CODE, inline_edit, inline_init};

    use crate::{
        service_provider::ServiceProvider,
        stocktake::{
            update::{UpdateStocktake, UpdateStocktakeError},
            UpdateStocktakeStatus,
        },
    };

    #[actix_rt::test]
    async fn update_stocktake() {
        fn mock_stocktake_existing_line() -> StocktakeRow {
            inline_init(|r: &mut StocktakeRow| {
                r.id = "mock_stocktake_existing_line".to_string();
                r.store_id = "store_a".to_string();
                r.stocktake_number = 10;
                r.created_datetime = NaiveDate::from_ymd_opt(2021, 12, 14)
                    .unwrap()
                    .and_hms_milli_opt(12, 33, 0, 0)
                    .unwrap();
                r.status = StocktakeStatus::New;
            })
        }

        fn mock_stocktake_line_existing_line() -> StocktakeLineRow {
            inline_init(|r: &mut StocktakeLineRow| {
                r.id = "mock_stocktake_line_existing_line".to_string();
                r.stocktake_id = mock_stocktake_existing_line().id;
                r.stock_line_id = Some(mock_existing_stock_line().id);
                r.counted_number_of_packs = Some(20.0);
                r.snapshot_number_of_packs = 20.0;
                r.item_link_id = mock_item_a().id;
                r.cost_price_per_pack = Some(1.0);
                r.sell_price_per_pack = Some(2.0);
            })
        }

        fn mock_existing_stock_line() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "existing_stock_a".to_string();
                r.item_link_id = "item_a".to_string();
                r.store_id = "store_a".to_string();
                r.available_number_of_packs = 20.0;
                r.pack_size = 1.0;
                r.cost_price_per_pack = 0.0;
                r.sell_price_per_pack = 0.0;
                r.total_number_of_packs = 20.0;
                r.on_hold = false;
                r.supplier_link_id = Some("name_store_b".to_string());
            })
        }

        fn mock_stocktake_no_counted_packs() -> StocktakeRow {
            inline_init(|r: &mut StocktakeRow| {
                r.id = "mock_stocktake_no_counted_packs".to_string();
                r.store_id = "store_a".to_string();
                r.stocktake_number = 20;
                r.created_datetime = NaiveDate::from_ymd_opt(2024, 12, 14)
                    .unwrap()
                    .and_hms_milli_opt(12, 33, 0, 0)
                    .unwrap();
                r.status = StocktakeStatus::New;
            })
        }

        fn mock_stocktake_line_no_counted_packs_line() -> StocktakeLineRow {
            inline_init(|r: &mut StocktakeLineRow| {
                r.id = "mock_stocktake_line_no_counted_packs_line".to_string();
                r.stocktake_id = mock_stocktake_no_counted_packs().id;
                r.stock_line_id = Some(mock_existing_stock_line_b().id);
                r.snapshot_number_of_packs = 10.0;
                r.item_link_id = mock_item_a().id;
                r.batch = Some("updated batch name".to_string());
                r.counted_number_of_packs = None;
            })
        }

        fn mock_existing_stock_line_b() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "existing_stock_b".to_string();
                r.item_link_id = "item_a".to_string();
                r.store_id = "store_a".to_string();
                r.available_number_of_packs = 10.0;
                r.pack_size = 2.0;
                r.total_number_of_packs = 10.0;
                r.batch = Some("initial batch name".to_string());
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_stocktake",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.stocktakes = vec![
                    mock_stocktake_existing_line(),
                    mock_stocktake_no_counted_packs(),
                ];
                r.stocktake_lines = vec![
                    mock_stocktake_line_existing_line(),
                    mock_stocktake_line_no_counted_packs_line(),
                ];
                r.stock_lines = vec![mock_existing_stock_line(), mock_existing_stock_line_b()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context("invalid".to_string(), "".to_string())
            .unwrap();
        let service = service_provider.stocktake_service;

        // error: InvalidStore
        let existing_stocktake = mock_stocktake_a();
        let error = service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id.clone_from(&existing_stocktake.id);
                }),
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeError::InvalidStore);

        // error: StocktakeDoesNotExist
        context.store_id = mock_store_a().id;
        let error = service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id = "invalid".to_string();
                }),
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeError::StocktakeDoesNotExist);

        // error: CannotEditFinalised
        let stocktake = mock_stocktake_finalised_without_lines();
        let error = service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id = stocktake.id;
                    i.comment = Some("Comment".to_string());
                }),
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeError::CannotEditFinalised);

        // error: StocktakeIsLocked
        let stocktake = mock_locked_stocktake();
        let error = service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id = stocktake.id;
                    i.comment = Some("Comment".to_string());
                }),
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeError::StocktakeIsLocked);

        // error: SnapshotCountCurrentCountMismatch
        let mut stock_line = mock_stock_line_a();
        stock_line.total_number_of_packs = 5.0;
        StockLineRowRepository::new(&context.connection)
            .upsert_one(&stock_line)
            .unwrap();
        let stocktake = mock_stocktake_a();
        let error = service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id = stocktake.id;
                    i.comment = Some("Comment".to_string());
                    i.status = Some(UpdateStocktakeStatus::Finalised);
                }),
            )
            .unwrap_err();
        assert_eq!(
            error,
            UpdateStocktakeError::SnapshotCountCurrentCountMismatch(vec![StocktakeLine {
                line: mock_stocktake_line_a(),
                stock_line: Some(stock_line),
                location: None,
                item: mock_item_a(),
            }])
        );

        // error: NoLines
        let stocktake = mock_stocktake_no_lines();
        let error = service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id = stocktake.id;
                    i.comment = Some("Comment".to_string());
                    i.status = Some(UpdateStocktakeStatus::Finalised);
                }),
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeError::NoLines);

        // success surplus should result in StockIn shipment line
        let stocktake = mock_stocktake_stock_surplus();
        let stocktake_line = mock_stocktake_line_stock_surplus();
        let stock_line = mock_stock_line_b();
        let surplus_amount =
            stocktake_line.counted_number_of_packs.unwrap() - stock_line.total_number_of_packs;

        let result = service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id = stocktake.id;
                    i.status = Some(UpdateStocktakeStatus::Finalised);
                }),
            )
            .unwrap();
        let invoice_line = InvoiceLineRowRepository::new(&context.connection)
            .find_many_by_invoice_id(&result.inventory_addition_id.unwrap())
            .unwrap()
            .pop()
            .unwrap();
        assert_eq!(invoice_line.r#type, InvoiceLineType::StockIn);
        assert_eq!(invoice_line.number_of_packs, surplus_amount);
        assert_eq!(result.inventory_reduction_id, None);

        // success deficit should result in StockOut shipment line
        let stocktake = mock_stocktake_stock_deficit();
        let stocktake_line = mock_stocktake_line_stock_deficit();
        let stock_line = mock_stock_line_b();
        let deficit_amount =
            stocktake_line.counted_number_of_packs.unwrap() - stock_line.total_number_of_packs;

        let result = service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id = stocktake.id;
                    i.status = Some(UpdateStocktakeStatus::Finalised);
                }),
            )
            .unwrap();
        let invoice_line = InvoiceLineRowRepository::new(&context.connection)
            .find_many_by_invoice_id(&result.inventory_reduction_id.unwrap())
            .unwrap()
            .pop()
            .unwrap();
        assert_eq!(invoice_line.r#type, InvoiceLineType::StockOut);
        assert_eq!(invoice_line.number_of_packs, f64::abs(deficit_amount));
        assert_eq!(result.inventory_addition_id, None);

        // success: no count change should not generate shipment line
        let stocktake = mock_stocktake_no_count_change();
        let invoice_line_count = InvoiceLineRepository::new(&context.connection)
            .count(None)
            .unwrap();
        let result = service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id = stocktake.id;
                    i.status = Some(UpdateStocktakeStatus::Finalised);
                }),
            )
            .unwrap();
        assert_eq!(
            InvoiceLineRepository::new(&context.connection).count(None),
            Ok(invoice_line_count)
        );
        assert_eq!(result.inventory_addition_id, None);
        assert_eq!(result.inventory_reduction_id, None);

        // success: no changes (not finalised)
        let stocktake = mock_stocktake_a();
        let result = service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id = stocktake.id;
                }),
            )
            .unwrap();
        assert_eq!(result, mock_stocktake_a());

        // success: Edit and lock
        let stocktake = mock_stocktake_a();
        service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id.clone_from(&stocktake.id);
                    i.is_locked = Some(true);
                    i.comment = Some("New comment".to_string());
                }),
            )
            .unwrap();

        assert_eq!(
            StocktakeRepository::new(&connection)
                .find_one_by_id(&stocktake.id)
                .unwrap()
                .unwrap(),
            inline_edit(&stocktake, |mut r: StocktakeRow| {
                r.is_locked = true;
                r.comment = Some("New comment".to_string());
                r
            })
        );

        // success: Edit and un-lock
        let stocktake = mock_stocktake_a();
        service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id.clone_from(&stocktake.id);
                    i.is_locked = Some(false);
                    i.comment = Some("Comment".to_string());
                }),
            )
            .unwrap();

        assert_eq!(
            StocktakeRepository::new(&connection)
                .find_one_by_id(&stocktake.id)
                .unwrap()
                .unwrap(),
            inline_edit(&stocktake, |mut r: StocktakeRow| {
                r.is_locked = false;
                r.comment = Some("Comment".to_string());
                r
            })
        );
        // success: all changes (not finalised)
        let stocktake = mock_stocktake_full_edit();
        let result = service
            .update_stocktake(
                &context,
                UpdateStocktake {
                    id: stocktake.id.clone(),
                    comment: Some("comment_1".to_string()),
                    description: Some("description_1".to_string()),
                    status: None,
                    stocktake_date: Some(NaiveDate::from_ymd_opt(2019, 3, 20).unwrap()),
                    is_locked: Some(false),
                },
            )
            .unwrap();

        assert_eq!(
            result,
            inline_edit(&stocktake, |mut i: StocktakeRow| {
                i.comment = Some("comment_1".to_string());
                i.description = Some("description_1".to_string());
                i.stocktake_date = Some(NaiveDate::from_ymd_opt(2019, 3, 20).unwrap());
                i.is_locked = false;
                i
            }),
        );

        // success: new stock line
        let stocktake = mock_stocktake_new_stock_line();
        let result = service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id.clone_from(&stocktake.id);
                    i.status = Some(UpdateStocktakeStatus::Finalised);
                }),
            )
            .unwrap();
        let shipment_line = InvoiceLineRowRepository::new(&context.connection)
            .find_many_by_invoice_id(&result.inventory_addition_id.unwrap())
            .unwrap()
            .pop()
            .unwrap();
        let stock_line = StockLineRowRepository::new(&context.connection)
            .find_one_by_id(&shipment_line.stock_line_id.unwrap())
            .unwrap()
            .unwrap();
        let stocktake_line = mock_stocktake_line_new_stock_line();
        assert_eq!(stock_line.expiry_date, stocktake_line.expiry_date);
        assert_eq!(stock_line.batch, stocktake_line.batch);
        assert_eq!(stock_line.pack_size, stocktake_line.pack_size.unwrap());
        assert_eq!(
            stock_line.cost_price_per_pack,
            stocktake_line.cost_price_per_pack.unwrap()
        );
        assert_eq!(
            stock_line.sell_price_per_pack,
            stocktake_line.sell_price_per_pack.unwrap()
        );
        assert_eq!(stock_line.note, stocktake_line.note);
        assert_eq!(
            stock_line.supplier_link_id.unwrap(),
            INVENTORY_ADJUSTMENT_NAME_CODE.to_string()
        );

        // assert stocktake_line has been updated
        let updated_stocktake_line = StocktakeLineRowRepository::new(&context.connection)
            .find_one_by_id(&stocktake_line.id)
            .unwrap()
            .unwrap();
        assert_eq!(updated_stocktake_line.stock_line_id, Some(stock_line.id));

        // success same supplier id
        let result = service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id.clone_from(&mock_stocktake_existing_line().id);
                    i.status = Some(UpdateStocktakeStatus::Finalised);
                }),
            )
            .unwrap();
        let stocktake_line = StocktakeLineRepository::new(&context.connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to(&result.id)),
                None,
            )
            .unwrap();
        let stock_line = stocktake_line[0].stock_line.clone().unwrap();
        assert_eq!(
            stock_line.supplier_link_id,
            mock_stock_line_b().supplier_link_id
        );

        // success - prunes uncounted lines
        let result = service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id.clone_from(&mock_stocktake_no_counted_packs().id);
                    i.status = Some(UpdateStocktakeStatus::Finalised);
                }),
            )
            .unwrap();

        let stocktake_line = StocktakeLineRepository::new(&context.connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to(&result.id)),
                None,
            )
            .unwrap();

        // line has been pruned, as was counted_number_of_packs = None
        assert_eq!(stocktake_line.len(), 0);

        let stock_line = StockLineRowRepository::new(&context.connection)
            .find_one_by_id(&mock_existing_stock_line_b().id)
            .unwrap()
            .unwrap();

        // still has initial batch name (was not updated)
        assert_eq!(stock_line.batch, Some("initial batch name".to_string()),);
    }
}
