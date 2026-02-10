mod validate;
use validate::validate;

mod generate;
use generate::*;

use chrono::{NaiveDate, Utc};
use repository::{
    vvm_status::vvm_status_log_row::VVMStatusLogRowRepository, ActivityLogType,
    InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository, InvoiceStatus,
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

#[derive(Debug, Clone, Default)]
pub enum UpdateStocktakeStatus {
    #[default]
    Finalised,
}

#[derive(Default, Debug, Clone)]
pub struct UpdateStocktake {
    pub id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub status: Option<UpdateStocktakeStatus>,
    pub stocktake_date: Option<NaiveDate>,
    pub is_locked: Option<bool>,
    pub counted_by: Option<String>,
    pub verified_by: Option<String>,
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
            let vvm_status_log_repo = VVMStatusLogRowRepository::new(connection);

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
                invoice_line_repo.update_reason_option_id(
                    &update_reason.invoice_line_id,
                    update_reason.reason_option_id,
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

            for vvm_status_log in result.vvm_status_logs {
                vvm_status_log_repo.upsert_one(&vvm_status_log)?;
            }

            if status_changed {
                activity_log_entry(
                    ctx,
                    ActivityLogType::StocktakeStatusFinalised,
                    Some(stocktake_id.to_string()),
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
            mock_donor_b, mock_item_a, mock_item_a_variant_1, mock_locked_stocktake,
            mock_stock_line_a, mock_stock_line_b, mock_stocktake_a,
            mock_stocktake_finalised_without_lines, mock_stocktake_full_edit,
            mock_stocktake_line_a, mock_stocktake_line_new_stock_line,
            mock_stocktake_line_stock_deficit, mock_stocktake_line_stock_surplus,
            mock_stocktake_new_stock_line, mock_stocktake_no_count_change, mock_stocktake_no_lines,
            mock_stocktake_stock_deficit, mock_stocktake_stock_surplus, mock_store_a, MockData,
            MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        EqualFilter, InvoiceLineRepository, InvoiceLineRowRepository, InvoiceLineType,
        StockLineRow, StockLineRowRepository, StocktakeLine, StocktakeLineFilter,
        StocktakeLineRepository, StocktakeLineRow, StocktakeLineRowRepository, StocktakeRepository,
        StocktakeRow, StocktakeStatus,
    };
    use util::constants::INVENTORY_ADJUSTMENT_NAME_CODE;

    use crate::{
        service_provider::ServiceProvider,
        stocktake::{
            update::{UpdateStocktake, UpdateStocktakeError},
            UpdateStocktakeStatus,
        },
        stocktake_line::UpdateStocktakeLine,
        NullableUpdate,
    };

    #[actix_rt::test]
    async fn update_stocktake() {
        fn mock_stocktake_existing_line() -> StocktakeRow {
            StocktakeRow {
                id: "mock_stocktake_existing_line".to_string(),
                store_id: "store_a".to_string(),
                stocktake_number: 10,
                created_datetime: NaiveDate::from_ymd_opt(2021, 12, 14)
                    .unwrap()
                    .and_hms_milli_opt(12, 33, 0, 0)
                    .unwrap(),
                status: StocktakeStatus::New,
                ..Default::default()
            }
        }

        fn mock_stocktake_line_existing_line() -> StocktakeLineRow {
            StocktakeLineRow {
                id: "mock_stocktake_line_existing_line".to_string(),
                stocktake_id: mock_stocktake_existing_line().id,
                stock_line_id: Some(mock_existing_stock_line().id),
                counted_number_of_packs: Some(20.0),
                snapshot_number_of_packs: 20.0,
                item_link_id: mock_item_a().id,
                cost_price_per_pack: Some(1.0),
                sell_price_per_pack: Some(2.0),
                ..Default::default()
            }
        }

        fn mock_existing_stock_line() -> StockLineRow {
            StockLineRow {
                id: "existing_stock_a".to_string(),
                item_link_id: "item_a".to_string(),
                store_id: "store_a".to_string(),
                available_number_of_packs: 20.0,
                pack_size: 1.0,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_number_of_packs: 20.0,
                on_hold: false,
                supplier_link_id: Some("name_store_b".to_string()),
                ..Default::default()
            }
        }

        fn mock_stocktake_no_counted_packs() -> StocktakeRow {
            StocktakeRow {
                id: "mock_stocktake_no_counted_packs".to_string(),
                store_id: "store_a".to_string(),
                stocktake_number: 20,
                created_datetime: NaiveDate::from_ymd_opt(2024, 12, 14)
                    .unwrap()
                    .and_hms_milli_opt(12, 33, 0, 0)
                    .unwrap(),
                status: StocktakeStatus::New,
                ..Default::default()
            }
        }

        fn mock_stocktake_line_no_counted_packs_line() -> StocktakeLineRow {
            StocktakeLineRow {
                id: "mock_stocktake_line_no_counted_packs_line".to_string(),
                stocktake_id: mock_stocktake_no_counted_packs().id,
                stock_line_id: Some(mock_existing_stock_line_b().id),
                snapshot_number_of_packs: 10.0,
                item_link_id: mock_item_a().id,
                batch: Some("updated batch name".to_string()),
                counted_number_of_packs: None,
                ..Default::default()
            }
        }

        fn mock_existing_stock_line_b() -> StockLineRow {
            StockLineRow {
                id: "existing_stock_b".to_string(),
                item_link_id: "item_a".to_string(),
                store_id: "store_a".to_string(),
                available_number_of_packs: 10.0,
                pack_size: 2.0,
                total_number_of_packs: 10.0,
                batch: Some("initial batch name".to_string()),
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_stocktake",
            MockDataInserts::all(),
            MockData {
                stocktakes: vec![
                    mock_stocktake_existing_line(),
                    mock_stocktake_no_counted_packs(),
                ],
                stocktake_lines: vec![
                    mock_stocktake_line_existing_line(),
                    mock_stocktake_line_no_counted_packs_line(),
                ],
                stock_lines: vec![mock_existing_stock_line(), mock_existing_stock_line_b()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context("invalid".to_string(), "".to_string())
            .unwrap();
        let service = service_provider.stocktake_service;

        // error: InvalidStore
        let existing_stocktake = mock_stocktake_a();
        let error = service
            .update_stocktake(
                &context,
                UpdateStocktake {
                    id: existing_stocktake.id.clone(),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeError::InvalidStore);

        // error: StocktakeDoesNotExist
        context.store_id = mock_store_a().id;
        let error = service
            .update_stocktake(
                &context,
                UpdateStocktake {
                    id: "invalid".to_string(),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeError::StocktakeDoesNotExist);

        // error: CannotEditFinalised
        let stocktake = mock_stocktake_finalised_without_lines();
        let error = service
            .update_stocktake(
                &context,
                UpdateStocktake {
                    id: stocktake.id,
                    comment: Some("Comment".to_string()),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeError::CannotEditFinalised);

        // error: StocktakeIsLocked
        let stocktake = mock_locked_stocktake();
        let error = service
            .update_stocktake(
                &context,
                UpdateStocktake {
                    id: stocktake.id,
                    comment: Some("Comment".to_string()),
                    ..Default::default()
                },
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
                UpdateStocktake {
                    id: stocktake.id,
                    comment: Some("Comment".to_string()),
                    status: Some(UpdateStocktakeStatus::Finalised),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(
            error,
            UpdateStocktakeError::SnapshotCountCurrentCountMismatch(vec![StocktakeLine {
                line: mock_stocktake_line_a(),
                stock_line: Some(stock_line),
                location: None,
                item: mock_item_a(),
                donor: None,
                reason_option: None,
            }])
        );

        // error: NoLines
        let stocktake = mock_stocktake_no_lines();
        let error = service
            .update_stocktake(
                &context,
                UpdateStocktake {
                    id: stocktake.id,
                    comment: Some("Comment".to_string()),
                    status: Some(UpdateStocktakeStatus::Finalised),
                    ..Default::default()
                },
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
                UpdateStocktake {
                    id: stocktake.id,
                    status: Some(UpdateStocktakeStatus::Finalised),
                    ..Default::default()
                },
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
                UpdateStocktake {
                    id: stocktake.id,
                    status: Some(UpdateStocktakeStatus::Finalised),
                    ..Default::default()
                },
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
                UpdateStocktake {
                    id: stocktake.id,
                    status: Some(UpdateStocktakeStatus::Finalised),
                    ..Default::default()
                },
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
                UpdateStocktake {
                    id: stocktake.id,
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(result, mock_stocktake_a());

        // success: Edit and lock
        let stocktake = mock_stocktake_a();
        service
            .update_stocktake(
                &context,
                UpdateStocktake {
                    id: stocktake.id.clone(),
                    is_locked: Some(true),
                    comment: Some("New comment".to_string()),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(
            StocktakeRepository::new(&connection)
                .find_one_by_id(&stocktake.id)
                .unwrap()
                .unwrap(),
            {
                let mut expected = stocktake.clone();
                expected.is_locked = true;
                expected.comment = Some("New comment".to_string());
                expected
            }
        );

        // success: Edit and un-lock
        let stocktake = mock_stocktake_a();
        service
            .update_stocktake(
                &context,
                UpdateStocktake {
                    id: stocktake.id.clone(),
                    is_locked: Some(false),
                    comment: Some("Comment".to_string()),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(
            StocktakeRepository::new(&connection)
                .find_one_by_id(&stocktake.id)
                .unwrap()
                .unwrap(),
            {
                let mut expected = stocktake.clone();
                expected.is_locked = false;
                expected.comment = Some("Comment".to_string());
                expected
            }
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
                    counted_by: Some("user_a".to_string()),
                    verified_by: Some("user_b".to_string()),
                },
            )
            .unwrap();

        assert_eq!(result, {
            let mut expected = stocktake.clone();
            expected.comment = Some("comment_1".to_string());
            expected.description = Some("description_1".to_string());
            expected.stocktake_date = Some(NaiveDate::from_ymd_opt(2019, 3, 20).unwrap());
            expected.is_locked = false;
            expected.counted_by = Some("user_a".to_string());
            expected.verified_by = Some("user_b".to_string());
            expected
        },);

        // success: new stock line
        let stocktake = mock_stocktake_new_stock_line();
        let result = service
            .update_stocktake(
                &context,
                UpdateStocktake {
                    id: stocktake.id.clone(),
                    status: Some(UpdateStocktakeStatus::Finalised),
                    ..Default::default()
                },
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
        assert_eq!(stock_line.donor_link_id, stocktake_line.donor_link_id);

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
                UpdateStocktake {
                    id: mock_stocktake_existing_line().id.clone(),
                    status: Some(UpdateStocktakeStatus::Finalised),
                    ..Default::default()
                },
            )
            .unwrap();
        let stocktake_line = StocktakeLineRepository::new(&context.connection)
            .query_by_filter(
                StocktakeLineFilter::new()
                    .stocktake_id(EqualFilter::equal_to(result.id.to_string())),
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
                UpdateStocktake {
                    id: mock_stocktake_no_counted_packs().id.clone(),
                    status: Some(UpdateStocktakeStatus::Finalised),
                    ..Default::default()
                },
            )
            .unwrap();

        let stocktake_line = StocktakeLineRepository::new(&context.connection)
            .query_by_filter(
                StocktakeLineFilter::new()
                    .stocktake_id(EqualFilter::equal_to(result.id.to_string())),
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

    #[actix_rt::test]
    async fn update_stocktake_stock_lines_update() {
        let (_, connection, connection_manager, _) = setup_all(
            "update_stocktake_stock_lines_update",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let stocktake_service = service_provider.stocktake_service;
        let stocktake_line_service = service_provider.stocktake_line_service;

        // Donor & item variant updates
        stocktake_line_service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: mock_stocktake_line_stock_surplus().id.clone(),
                    item_variant_id: Some(NullableUpdate {
                        value: Some(mock_item_a_variant_1().id.clone()),
                    }),
                    donor_id: Some(NullableUpdate {
                        value: Some(mock_donor_b().id.clone()),
                    }),
                    ..Default::default()
                },
            )
            .unwrap();

        let result = stocktake_service
            .update_stocktake(
                &context,
                UpdateStocktake {
                    id: mock_stocktake_stock_surplus().id.clone(),
                    status: Some(UpdateStocktakeStatus::Finalised),
                    ..Default::default()
                },
            )
            .unwrap();

        let stocktake_line = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new()
                    .id(EqualFilter::equal_to(
                        mock_stocktake_line_stock_surplus().id,
                    ))
                    .stocktake_id(EqualFilter::equal_to(result.id.to_string())),
                None,
            )
            .unwrap()
            .pop()
            .unwrap();
        assert_eq!(
            stocktake_line.stock_line.as_ref().unwrap().donor_link_id,
            Some(mock_donor_b().id.clone())
        );
        assert_eq!(
            stocktake_line.stock_line.as_ref().unwrap().item_variant_id,
            Some(mock_item_a_variant_1().id.clone())
        );
    }
}
