use chrono::{NaiveDate, Utc};
use repository::{
    location_movement::{LocationMovementFilter, LocationMovementRepository},
    ActivityLogType, CurrencyFilter, CurrencyRepository, DatetimeFilter, EqualFilter,
    InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType,
    LocationMovementRow, LocationMovementRowRepository, NameRowRepository, NumberRowType,
    RepositoryError, StockLine, StockLineFilter, StockLineRepository, StockLineRow,
    StockLineRowRepository, Stocktake, StocktakeLine, StocktakeLineFilter, StocktakeLineRepository,
    StocktakeLineRow, StocktakeLineRowRepository, StocktakeRow, StocktakeRowRepository,
    StocktakeStatus, StorageConnection,
};
use util::{constants::INVENTORY_ADJUSTMENT_NAME_CODE, inline_edit, uuid::uuid};

use crate::{
    activity_log::activity_log_entry,
    invoice::inventory_adjustment::UpdateInventoryAdjustmentReason,
    invoice_line::{
        stock_in_line::{
            insert_stock_in_line, InsertStockInLine, InsertStockInLineError, StockInType,
        },
        stock_out_line::{
            insert_stock_out_line, InsertStockOutLine, InsertStockOutLineError, StockOutType,
        },
    },
    number::next_number,
    service_provider::ServiceContext,
    stocktake::query::get_stocktake,
    validate::check_store_id_matches,
    NullableUpdate,
};

use super::validate::{check_stocktake_exist, check_stocktake_not_finalised};

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

fn check_snapshot_matches_current_count(
    stocktake_lines: &[StocktakeLine],
) -> Option<Vec<StocktakeLine>> {
    let mut mismatches = Vec::new();
    for line in stocktake_lines {
        let stock_line = match &line.stock_line {
            Some(stock_line) => stock_line,
            None => continue,
        };
        if line.line.snapshot_number_of_packs != stock_line.total_number_of_packs {
            mismatches.push(line.clone());
        }
    }
    if !mismatches.is_empty() {
        return Some(mismatches);
    }
    None
}

fn check_stock_lines_reduced_to_zero(
    connection: &StorageConnection,
    stocktake_lines: &Vec<StocktakeLine>,
) -> Result<Option<Vec<StockLine>>, RepositoryError> {
    let mut lines_reduced_to_zero = Vec::new();

    for line in stocktake_lines {
        let stock_line_row = match &line.stock_line {
            Some(stock_line) => stock_line,
            None => continue,
        };
        if let Some(counted_number_of_packs) = line.line.counted_number_of_packs {
            let adjustment = stock_line_row.total_number_of_packs - counted_number_of_packs;

            if adjustment > 0.0
                && (stock_line_row.total_number_of_packs - adjustment < 0.0
                    || stock_line_row.available_number_of_packs - adjustment < 0.0)
            {
                let stock_line = StockLineRepository::new(connection)
                    .query_by_filter(
                        StockLineFilter::new().id(EqualFilter::equal_to(&stock_line_row.id)),
                        None,
                    )?
                    .pop()
                    .ok_or_else(|| RepositoryError::NotFound)?;

                lines_reduced_to_zero.push(stock_line.clone())
            }
        }
    }

    if !lines_reduced_to_zero.is_empty() {
        return Ok(Some(lines_reduced_to_zero));
    }
    Ok(None)
}

fn load_stocktake_lines(
    connection: &StorageConnection,
    stocktake_id: &str,
    store_id: &str,
) -> Result<Vec<StocktakeLine>, RepositoryError> {
    StocktakeLineRepository::new(connection).query_by_filter(
        StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to(stocktake_id)),
        Some(store_id.to_string()),
    )
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateStocktake,
) -> Result<(StocktakeRow, Vec<StocktakeLine>, bool), UpdateStocktakeError> {
    let existing = match check_stocktake_exist(connection, &input.id)? {
        Some(existing) => existing,
        None => return Err(UpdateStocktakeError::StocktakeDoesNotExist),
    };
    if !check_stocktake_not_finalised(&existing.status) {
        return Err(UpdateStocktakeError::CannotEditFinalised);
    }

    if !check_stocktake_is_not_locked(&input, &existing) {
        return Err(UpdateStocktakeError::StocktakeIsLocked);
    }

    if !check_store_id_matches(store_id, &existing.store_id) {
        return Err(UpdateStocktakeError::InvalidStore);
    }
    let stocktake_lines = load_stocktake_lines(connection, &input.id, store_id)?;

    let status_changed = input.status.is_some();
    if status_changed {
        if stocktake_lines.len() == 0 {
            return Err(UpdateStocktakeError::NoLines);
        }

        if let Some(stock_reduced_to_zero) =
            check_stock_lines_reduced_to_zero(connection, &stocktake_lines)?
        {
            return Err(UpdateStocktakeError::StockLinesReducedBelowZero(
                stock_reduced_to_zero,
            ));
        }

        if let Some(mismatches) = check_snapshot_matches_current_count(&stocktake_lines) {
            return Err(UpdateStocktakeError::SnapshotCountCurrentCountMismatch(
                mismatches,
            ));
        }
    }

    Ok((existing, stocktake_lines, status_changed))
}

pub fn check_stocktake_is_not_locked(input: &UpdateStocktake, existing: &StocktakeRow) -> bool {
    match &input.is_locked {
        Some(false) => true,
        _ => !existing.is_locked,
    }
}

#[derive(Default)]
struct StocktakeGenerateJob {
    stocktake: StocktakeRow,
    // list of stocktake lines to be updated, e.g. to link newly created stock_lines during
    // stocktake finalisation.
    stocktake_lines: Vec<StocktakeLineRow>,

    // new inventory adjustment
    inventory_addition: Option<InvoiceRow>,
    inventory_reduction: Option<InvoiceRow>,
    inventory_addition_lines: Vec<InsertStockInLine>,
    inventory_reduction_lines: Vec<InsertStockOutLine>,
    inventory_adjustment_reason_updates: Vec<UpdateInventoryAdjustmentReason>,

    // list of stock_line upserts
    stock_lines: Vec<StockLineRow>,

    stocktake_lines_to_trim: Option<Vec<StocktakeLineRow>>,
    location_movements: Option<Vec<LocationMovementRow>>,
}

pub enum StockChange {
    StockIn(InsertStockInLine),
    StockOut(InsertStockOutLine),
    StockUpdate(StockLineRow),
}

/// Contains entities to be updated when a stock line is update/created
struct StockLineJob {
    stock_in_out_or_update: Option<StockChange>,
    stocktake_line: Option<StocktakeLineRow>,
    location_movement: Option<LocationMovementRow>,
    update_inventory_adjustment_reason: Option<UpdateInventoryAdjustmentReason>,
}

fn generate_update_inventory_adjustment_reason(
    invoice_line_id: String,
    inventory_adjustment_reason_id: Option<String>,
) -> Option<UpdateInventoryAdjustmentReason> {
    inventory_adjustment_reason_id.map(|reason_id| UpdateInventoryAdjustmentReason {
        reason_id: Some(reason_id),
        invoice_line_id,
    })
}

/// Returns new stock line and matching invoice line
fn generate_stock_in_out_or_update(
    connection: &StorageConnection,
    store_id: &str,
    inventory_addition_id: &str,
    inventory_reduction_id: &str,
    stocktake_line: &StocktakeLine,
    stock_line: &StockLineRow,
) -> Result<StockLineJob, UpdateStocktakeError> {
    let row = stocktake_line.line.to_owned();

    let counted_number_of_packs = row
        .counted_number_of_packs
        .unwrap_or(stocktake_line.line.snapshot_number_of_packs);
    let delta = counted_number_of_packs - row.snapshot_number_of_packs;

    let stock_line_row = stock_line.to_owned();

    let pack_size = row.pack_size.unwrap_or(stock_line_row.pack_size);
    let expiry_date = row.expiry_date.or(stock_line_row.expiry_date);
    let cost_price_per_pack = row
        .cost_price_per_pack
        .unwrap_or(stock_line_row.cost_price_per_pack);
    let sell_price_per_pack = row
        .sell_price_per_pack
        .unwrap_or(stock_line_row.sell_price_per_pack);

    // If no change in stock quantity, we just update the stock line (no inventory adjustment)
    if delta == 0.0 {
        let updated_stock_line = StockLineRow {
            location_id: row.location_id,
            batch: row.batch,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            expiry_date,
            ..stock_line_row
        }
        .to_owned();

        return Ok(StockLineJob {
            stock_in_out_or_update: Some(StockChange::StockUpdate(updated_stock_line)),
            stocktake_line: None,
            location_movement: None,
            update_inventory_adjustment_reason: None,
        });
    };

    let quantity_change = f64::abs(delta);
    let invoice_line_id = uuid();

    let update_inventory_adjustment_reason = generate_update_inventory_adjustment_reason(
        invoice_line_id.clone(),
        row.inventory_adjustment_reason_id,
    );

    let stock_in_or_out_line = if delta > 0.0 {
        StockChange::StockIn(InsertStockInLine {
            r#type: StockInType::InventoryAddition,
            id: invoice_line_id,
            invoice_id: inventory_addition_id.to_string(),
            number_of_packs: quantity_change,
            location: row.location_id.map(|id| NullableUpdate { value: Some(id) }),
            pack_size,
            batch: row.batch,
            cost_price_per_pack,
            sell_price_per_pack,
            expiry_date,
            // From existing stock line
            stock_line_id: Some(stock_line_row.id),
            item_id: stock_line_row.item_link_id,
            stock_on_hold: stock_line_row.on_hold,
            note: stock_line_row.note,
            // Default
            barcode: stock_line_row.barcode_id,
            total_before_tax: None,
            tax_percentage: None,
        })
    } else {
        StockChange::StockOut(InsertStockOutLine {
            r#type: StockOutType::InventoryReduction,
            id: invoice_line_id,
            invoice_id: inventory_reduction_id.to_string(),
            stock_line_id: stock_line_row.id,
            number_of_packs: quantity_change,
            note: stock_line_row.note,
            location_id: row.location_id,
            batch: row.batch,
            pack_size: row.pack_size,
            expiry_date: row.expiry_date,
            cost_price_per_pack: None,
            sell_price_per_pack: None,
            total_before_tax: None,
            tax_percentage: None,
        })
    };

    // if reducing to 0, create movement to exit location
    let location_movement = if counted_number_of_packs == 0.0 {
        generate_exit_location_movements(connection, &store_id, stock_line.clone())?
    } else {
        None
    };

    Ok(StockLineJob {
        stock_in_out_or_update: Some(stock_in_or_out_line),
        location_movement,
        stocktake_line: None,
        update_inventory_adjustment_reason,
    })
}

fn generate_new_stock_line(
    store_id: &str,
    inventory_addition_id: &str,
    stocktake_line: &StocktakeLine,
) -> Result<StockLineJob, UpdateStocktakeError> {
    let row = stocktake_line.line.to_owned();
    let item_id = stocktake_line.item.id.to_owned();
    let stock_line_id = uuid();

    let counted_number_of_packs = stocktake_line.line.counted_number_of_packs.unwrap_or(0.0);

    // If no counted packs, we shouldn't create a stock line
    if counted_number_of_packs == 0.0 {
        return Ok(StockLineJob {
            stock_in_out_or_update: None,
            location_movement: None,
            stocktake_line: None,
            update_inventory_adjustment_reason: None,
        });
    }

    // We're creating a new stock line, so need to update the stocktake line to link to the new stock line
    let updated_stocktake_line = StocktakeLineRow {
        stock_line_id: Some(stock_line_id.clone()),
        ..row.clone()
    };

    let pack_size = row.pack_size.unwrap_or(0.0);
    let cost_price_per_pack = row.cost_price_per_pack.unwrap_or(0.0);
    let sell_price_per_pack = row.sell_price_per_pack.unwrap_or(0.0);
    let invoice_line_id = uuid();

    let update_inventory_adjustment_reason = generate_update_inventory_adjustment_reason(
        invoice_line_id.clone(),
        row.inventory_adjustment_reason_id,
    );

    let stock_in_line = StockChange::StockIn(InsertStockInLine {
        r#type: StockInType::InventoryAddition,
        id: invoice_line_id,
        invoice_id: inventory_addition_id.to_string(),
        number_of_packs: counted_number_of_packs,
        location: row
            .location_id
            .clone()
            .map(|id| NullableUpdate { value: Some(id) }),
        pack_size,
        batch: row.batch,
        cost_price_per_pack,
        sell_price_per_pack,
        expiry_date: row.expiry_date,
        stock_line_id: Some(stock_line_id.clone()),
        item_id,
        note: row.note,
        // Default
        stock_on_hold: false,
        barcode: None,
        total_before_tax: None,
        tax_percentage: None,
    });

    // If new stock line has a location, create location movement
    let location_movement = if row.location_id.is_some() {
        Some(generate_enter_location_movements(
            store_id.to_owned(),
            stock_line_id,
            row.location_id,
        ))
    } else {
        None
    };

    Ok(StockLineJob {
        stock_in_out_or_update: Some(stock_in_line),
        location_movement,
        stocktake_line: Some(updated_stocktake_line),
        update_inventory_adjustment_reason,
    })
}

fn generate_enter_location_movements(
    store_id: String,
    stock_line_id: String,
    location_id: Option<String>,
) -> LocationMovementRow {
    LocationMovementRow {
        id: uuid(),
        store_id,
        stock_line_id,
        location_id,
        enter_datetime: Some(Utc::now().naive_utc()),
        exit_datetime: None,
    }
}

fn generate_exit_location_movements(
    connection: &StorageConnection,
    store_id: &str,
    stock_line: StockLineRow,
) -> Result<Option<LocationMovementRow>, RepositoryError> {
    match stock_line.location_id {
        Some(location_id) => {
            let filter = LocationMovementRepository::new(connection)
                .query_by_filter(
                    LocationMovementFilter::new()
                        .enter_datetime(DatetimeFilter::is_null(false))
                        .exit_datetime(DatetimeFilter::is_null(true))
                        .location_id(EqualFilter::equal_to(&location_id))
                        .stock_line_id(EqualFilter::equal_to(&stock_line.id))
                        .store_id(EqualFilter::equal_to(&store_id)),
                )?
                .into_iter()
                .map(|l| l.location_movement_row)
                .min_by_key(|l| l.enter_datetime);

            if filter.is_some() {
                let mut location_movement = filter.unwrap();
                location_movement.exit_datetime = Some(Utc::now().naive_utc());
                Ok(Some(location_movement))
            } else {
                Ok(None)
            }
        }
        None => Ok(None),
    }
}

fn unallocated_lines_to_trim(
    connection: &StorageConnection,
    stocktake: &StocktakeRow,
    store_id: &str,
) -> Result<Option<Vec<StocktakeLineRow>>, RepositoryError> {
    if stocktake.status != StocktakeStatus::Finalised {
        return Ok(None);
    }
    let stocktake_lines = StocktakeLineRepository::new(connection).query_by_filter(
        StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to(&stocktake.id)),
        Some(store_id.to_string()),
    )?;
    if stocktake_lines.is_empty() {
        return Ok(None);
    }
    let mut lines_to_trim = Vec::new();
    for line in stocktake_lines {
        if line.line.counted_number_of_packs.is_none() {
            lines_to_trim.push(line.line);
        }
    }
    if lines_to_trim.is_empty() {
        return Ok(None);
    }
    Ok(Some(lines_to_trim))
}

fn generate(
    ctx: &ServiceContext,
    UpdateStocktake {
        id: _,
        status: _,
        comment: input_comment,
        description: input_description,
        is_locked: input_is_locked,
        stocktake_date: input_stocktake_date,
    }: UpdateStocktake,
    existing: StocktakeRow,
    stocktake_lines: Vec<StocktakeLine>,
    is_finalised: bool,
) -> Result<StocktakeGenerateJob, UpdateStocktakeError> {
    let ServiceContext {
        connection,
        store_id,
        user_id,
        ..
    } = ctx;
    let currency = CurrencyRepository::new(connection)
        .query_by_filter(CurrencyFilter::new().is_home_currency(true))?
        .pop()
        .ok_or(UpdateStocktakeError::DatabaseError(
            RepositoryError::NotFound,
        ))?;

    let stocktake = inline_edit(&existing, |mut u: StocktakeRow| {
        u.description = input_description.or(u.description);
        u.comment = input_comment.or(u.comment);
        u.is_locked = input_is_locked.unwrap_or(false);
        u.stocktake_date = input_stocktake_date.or(u.stocktake_date);
        u
    });

    if !is_finalised {
        // just update the existing stocktakes
        return Ok(StocktakeGenerateJob {
            stocktake,
            ..Default::default()
        });
    }

    let now = Utc::now().naive_utc();
    let inventory_addition_id = uuid();
    let inventory_reduction_id = uuid();

    // finalise the stocktake
    let mut inventory_addition_lines: Vec<InsertStockInLine> = Vec::new();
    let mut inventory_reduction_lines: Vec<InsertStockOutLine> = Vec::new();
    let mut stock_lines: Vec<StockLineRow> = Vec::new();
    let mut inventory_adjustment_reason_updates: Vec<UpdateInventoryAdjustmentReason> = Vec::new();
    let mut stocktake_line_updates: Vec<StocktakeLineRow> = Vec::new();
    let mut location_movements: Vec<LocationMovementRow> = Vec::new();

    for stocktake_line in stocktake_lines {
        let StockLineJob {
            stocktake_line,
            location_movement,
            stock_in_out_or_update,
            update_inventory_adjustment_reason,
        } = if let Some(ref stock_line) = stocktake_line.stock_line {
            // adjust existing stock line
            generate_stock_in_out_or_update(
                connection,
                store_id,
                &inventory_addition_id,
                &inventory_reduction_id,
                &stocktake_line,
                stock_line,
            )?
        } else {
            // create new stock line
            generate_new_stock_line(&store_id, &inventory_addition_id, &stocktake_line)?
        };
        match stock_in_out_or_update {
            Some(StockChange::StockIn(line)) => {
                inventory_addition_lines.push(line);
            }
            Some(StockChange::StockOut(line)) => {
                inventory_reduction_lines.push(line);
            }
            Some(StockChange::StockUpdate(stock_line)) => {
                stock_lines.push(stock_line);
            }
            // None returned when new stock line was created but with num packs 0
            // We wouldn't want introduce a new stock line with 0 stock
            None => {}
        }
        if let Some(update_reason) = update_inventory_adjustment_reason {
            inventory_adjustment_reason_updates.push(update_reason);
        }
        if let Some(stocktake_line) = stocktake_line {
            stocktake_line_updates.push(stocktake_line);
        }
        if let Some(location_movement) = location_movement {
            location_movements.push(location_movement);
        }
    }

    // find inventory adjustment name:
    let inventory_adjustment_name = NameRowRepository::new(connection)
        .find_one_by_code(INVENTORY_ADJUSTMENT_NAME_CODE)?
        .ok_or(UpdateStocktakeError::InternalError(
            "Missing inventory adjustment name".to_string(),
        ))?;

    // Create adjustments
    let template_adjustment = InvoiceRow {
        // Different between addition and reduction
        id: "".to_string(),
        invoice_number: 0,
        r#type: InvoiceType::InventoryAddition,
        // Same for addition and reduction
        user_id: Some(user_id.to_string()),
        name_link_id: inventory_adjustment_name.id,
        store_id: store_id.to_string(),
        status: InvoiceStatus::New,
        verified_datetime: Some(now),
        // Default
        currency_id: Some(currency.currency_row.id),
        currency_rate: 1.0,
        name_store_id: None,
        transport_reference: None,
        on_hold: false,
        comment: None,
        their_reference: None,
        created_datetime: now,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        colour: None,
        requisition_id: None,
        linked_invoice_id: None,
        tax_percentage: None,
        clinician_link_id: None,
        original_shipment_id: None,
    };

    let inventory_addition = if !inventory_addition_lines.is_empty() {
        Some(InvoiceRow {
            id: inventory_addition_id,
            invoice_number: next_number(connection, &NumberRowType::InventoryAddition, store_id)?,
            r#type: InvoiceType::InventoryAddition,
            ..template_adjustment.clone()
        })
    } else {
        None
    };
    let inventory_reduction = if !inventory_reduction_lines.is_empty() {
        Some(InvoiceRow {
            id: inventory_reduction_id,
            invoice_number: next_number(connection, &NumberRowType::InventoryReduction, store_id)?,
            r#type: InvoiceType::InventoryReduction,
            ..template_adjustment.clone()
        })
    } else {
        None
    };

    let stocktake = inline_edit(&existing, |mut u: StocktakeRow| {
        u.status = StocktakeStatus::Finalised;
        u.finalised_datetime = Some(now);
        u.inventory_addition_id = inventory_addition.as_ref().map(|i| i.id.clone());
        u.inventory_reduction_id = inventory_reduction.as_ref().map(|i| i.id.clone());
        u
    });

    Ok(StocktakeGenerateJob {
        stocktake: stocktake.clone(),
        stocktake_lines: stocktake_line_updates,
        inventory_addition,
        inventory_reduction,
        inventory_addition_lines,
        inventory_reduction_lines,
        inventory_adjustment_reason_updates,
        stock_lines,
        location_movements: Some(location_movements),
        stocktake_lines_to_trim: unallocated_lines_to_trim(connection, &stocktake, &ctx.store_id)?,
    })
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
            let result = generate(&ctx, input, existing, stocktake_lines, status_changed)?;

            // write data to the DB
            let stock_line_repo = StockLineRowRepository::new(connection);
            let stocktake_line_repo = StocktakeLineRowRepository::new(connection);
            let invoice_row_repo = InvoiceRowRepository::new(connection);
            let invoice_line_repo = InvoiceLineRowRepository::new(&connection);

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
                    &ctx,
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

impl From<RepositoryError> for UpdateStocktakeError {
    fn from(error: RepositoryError) -> Self {
        UpdateStocktakeError::DatabaseError(error)
    }
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

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_stocktake",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.stocktakes = vec![mock_stocktake_existing_line()];
                r.stocktake_lines = vec![mock_stocktake_line_existing_line()];
                r.stock_lines = vec![mock_existing_stock_line()];
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
                    i.id = existing_stocktake.id.clone();
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
                    i.id = stocktake.id.clone();
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
                    i.id = stocktake.id.clone();
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
                    i.id = stocktake.id.clone();
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
                    i.id = mock_stocktake_existing_line().id.clone();
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
    }
}
