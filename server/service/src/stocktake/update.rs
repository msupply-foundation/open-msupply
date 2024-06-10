use chrono::{NaiveDate, Utc};
use repository::{
    location_movement::{LocationMovementFilter, LocationMovementRepository},
    ActivityLogType, CurrencyFilter, CurrencyRepository, DatetimeFilter, EqualFilter,
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, InvoiceRow, InvoiceRowRepository,
    InvoiceStatus, InvoiceType, ItemLinkRowRepository, ItemRowRepository, LocationMovementRow,
    LocationMovementRowRepository, NameLinkRowRepository, NameRowRepository, NumberRowType,
    RepositoryError, StockLine, StockLineFilter, StockLineRepository, StockLineRow,
    StockLineRowRepository, Stocktake, StocktakeLine, StocktakeLineFilter, StocktakeLineRepository,
    StocktakeLineRow, StocktakeLineRowRepository, StocktakeRow, StocktakeRowRepository,
    StocktakeStatus, StorageConnection,
};
use util::{constants::INVENTORY_ADJUSTMENT_NAME_CODE, inline_edit, uuid::uuid};

use crate::{
    activity_log::activity_log_entry, number::next_number, service_provider::ServiceContext,
    stocktake::query::get_stocktake, validate::check_store_id_matches,
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

    if !check_stocktake_is_not_locked(input, &existing) {
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
    // stocktake finialisation.
    stocktake_lines: Vec<StocktakeLineRow>,

    // new inventory adjustment
    inventory_addition: Option<InvoiceRow>,
    inventory_reduction: Option<InvoiceRow>,
    inventory_adjustment_lines: Vec<InvoiceLineRow>,

    // list of stock_line upserts
    stock_lines: Vec<StockLineRow>,

    stocktake_lines_to_trim: Option<Vec<StocktakeLineRow>>,
    location_movements: Option<Vec<LocationMovementRow>>,
}

/// Contains entities to be updated when a stock line is update/created
struct StockLineJob {
    stock_line: StockLineRow,
    invoice_line: Option<InvoiceLineRow>,
    stocktake_line: Option<StocktakeLineRow>,
    location_movement: Option<LocationMovementRow>,
}

/// Returns new stock line and matching invoice line
fn generate_stock_line_update(
    connection: &StorageConnection,
    store_id: &str,
    inventory_addition_id: &str,
    inventory_reduction_id: &str,
    stocktake_line: &StocktakeLine,
    stock_line: &StockLineRow,
) -> Result<StockLineJob, UpdateStocktakeError> {
    let counted_number_of_packs = stocktake_line
        .line
        .counted_number_of_packs
        .unwrap_or(stocktake_line.line.snapshot_number_of_packs);
    let delta = counted_number_of_packs - stocktake_line.line.snapshot_number_of_packs;

    let stock_line_item_id = ItemLinkRowRepository::new(connection)
        .find_one_by_id(&stock_line.item_link_id)?
        .ok_or(UpdateStocktakeError::InternalError(format!(
            "Item link ({}) not found",
            stock_line.item_link_id
        )))?
        .item_id;
    let stock_line_supplier_id = if let Some(supplier_link_id) = &stock_line.supplier_link_id {
        Some(
            NameLinkRowRepository::new(connection)
                .find_one_by_id(supplier_link_id)?
                .ok_or(UpdateStocktakeError::InternalError(format!(
                    "Name link ({}) not found",
                    supplier_link_id
                )))?
                .name_id,
        )
    } else {
        None
    };

    let updated_line = StockLineRow {
        id: stock_line.id.clone(),
        item_link_id: stock_line_item_id.clone(),
        store_id: stock_line.store_id.clone(),
        location_id: stocktake_line.line.location_id.clone(),
        batch: stocktake_line.line.batch.clone(),
        pack_size: stocktake_line
            .line
            .pack_size
            .unwrap_or(stock_line.pack_size),
        cost_price_per_pack: stocktake_line
            .line
            .cost_price_per_pack
            .unwrap_or(stock_line.cost_price_per_pack),
        sell_price_per_pack: stocktake_line
            .line
            .sell_price_per_pack
            .unwrap_or(stock_line.sell_price_per_pack),
        // TODO might get negative!
        available_number_of_packs: stock_line.available_number_of_packs + delta,
        total_number_of_packs: stock_line.total_number_of_packs + delta,
        expiry_date: stocktake_line.line.expiry_date.or(stock_line.expiry_date),
        on_hold: stock_line.on_hold,
        note: stock_line.note.clone(),
        supplier_link_id: stock_line_supplier_id,
        barcode_id: stock_line.barcode_id.clone(),
    };

    let stock_line_item =
        match ItemRowRepository::new(connection).find_active_by_id(&stock_line_item_id)? {
            Some(item) => item,
            None => {
                return Err(UpdateStocktakeError::InternalError(format!(
                    "Can't find item {} for existing stocktake line {}!",
                    &stock_line_item_id, stocktake_line.line.id
                )))
            }
        };

    let quantity_change = f64::abs(delta);
    let shipment_line = if quantity_change > 0.0 {
        let (invoice_id, r#type) = if delta > 0.0 {
            (inventory_addition_id.to_string(), InvoiceLineType::StockIn)
        } else {
            (
                inventory_reduction_id.to_string(),
                InvoiceLineType::StockOut,
            )
        };
        Some(InvoiceLineRow {
            id: uuid(),
            r#type,
            invoice_id,
            item_link_id: stock_line_item_id,
            item_name: stock_line_item.name,
            item_code: stock_line_item.code,
            stock_line_id: Some(stock_line.id.clone()),
            location_id: stock_line.location_id.clone(),
            batch: stock_line.batch.clone(),
            expiry_date: stock_line.expiry_date,
            pack_size: stock_line.pack_size,
            cost_price_per_pack: stock_line.cost_price_per_pack,
            sell_price_per_pack: stock_line.sell_price_per_pack,
            total_before_tax: 0.0,
            total_after_tax: 0.0,
            tax_percentage: None,
            number_of_packs: quantity_change,
            note: stock_line.note.clone(),
            inventory_adjustment_reason_id: stocktake_line
                .line
                .inventory_adjustment_reason_id
                .clone(),
            return_reason_id: None,
            foreign_currency_price_before_tax: None,
        })
    } else {
        None
    };

    let location_movement = if counted_number_of_packs <= 0.0 {
        generate_exit_location_movements(connection, store_id, updated_line.clone())?
    } else {
        None
    };

    Ok(StockLineJob {
        stock_line: updated_line,
        invoice_line: shipment_line,
        stocktake_line: None,
        location_movement,
    })
}

/// Returns new stock line and matching invoice line
fn generate_new_stock_line(
    connection: &StorageConnection,
    store_id: &str,
    inventory_addition_id: &str,
    stocktake_line: StocktakeLine,
) -> Result<StockLineJob, UpdateStocktakeError> {
    let counted_number_of_packs = stocktake_line.line.counted_number_of_packs.unwrap_or(0.0);
    let row = stocktake_line.line;
    let pack_size = row.pack_size.unwrap_or(0.0);
    let cost_price_per_pack = row.cost_price_per_pack.unwrap_or(0.0);
    let sell_price_per_pack = row.sell_price_per_pack.unwrap_or(0.0);
    let stock_line_id = uuid();

    // update the stock_line_id in the existing stocktake_line
    let updated_stocktake_line = inline_edit(&row, |mut l: StocktakeLineRow| {
        l.stock_line_id = Some(stock_line_id.clone());
        l
    });

    let supplier_id = if let Some(supplier_link_id) = stocktake_line
        .stock_line
        .as_ref()
        .and_then(|it| it.supplier_link_id.clone())
    {
        Some(
            NameLinkRowRepository::new(connection)
                .find_one_by_id(&supplier_link_id)?
                .ok_or(UpdateStocktakeError::InternalError(format!(
                    "Name link ({}) not found",
                    supplier_link_id
                )))?
                .name_id,
        )
    } else {
        None
    };

    let item_id = stocktake_line.item.id;
    let new_line = StockLineRow {
        id: stock_line_id,
        item_link_id: item_id.clone(),
        store_id: store_id.to_string(),
        location_id: row.location_id.clone(),
        batch: row.batch.clone(),
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        available_number_of_packs: counted_number_of_packs,
        total_number_of_packs: counted_number_of_packs,
        expiry_date: row.expiry_date,
        on_hold: false,
        note: row.note.clone(),
        supplier_link_id: supplier_id,
        barcode_id: None,
    };

    let item = match ItemRowRepository::new(connection).find_active_by_id(&item_id)? {
        Some(item) => item,
        None => {
            return Err(UpdateStocktakeError::InternalError(format!(
                "Can't find item {} for new stocktake line {}!",
                &item_id, row.id
            )))
        }
    };
    let shipment_line = if counted_number_of_packs > 0.0 {
        Some(InvoiceLineRow {
            id: uuid(),
            r#type: InvoiceLineType::StockIn,
            invoice_id: inventory_addition_id.to_string(),
            item_link_id: item.id,
            item_name: item.name,
            item_code: item.code,
            stock_line_id: Some(new_line.id.clone()),
            location_id: row.location_id,
            batch: row.batch,
            expiry_date: row.expiry_date,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            total_before_tax: 0.0,
            total_after_tax: 0.0,
            tax_percentage: None,
            number_of_packs: counted_number_of_packs,
            note: row.note,
            inventory_adjustment_reason_id: row.inventory_adjustment_reason_id,
            return_reason_id: None,
            foreign_currency_price_before_tax: None,
        })
    } else {
        None
    };

    let location_movement = if new_line.location_id.is_some() {
        Some(generate_enter_location_movements(
            store_id.to_owned(),
            new_line.id.to_owned(),
            new_line.location_id.to_owned(),
        ))
    } else {
        None
    };

    Ok(StockLineJob {
        stock_line: new_line,
        invoice_line: shipment_line,
        stocktake_line: Some(updated_stocktake_line),
        location_movement,
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
                        .store_id(EqualFilter::equal_to(store_id)),
                )?
                .into_iter()
                .map(|l| l.location_movement_row)
                .min_by_key(|l| l.enter_datetime);

            if filter.is_some() {
                let mut location_movement = filter.unwrap();
                location_movement.exit_datetime = Some(Utc::now().naive_utc());
                return Ok(Some(location_movement));
            } else {
                return Ok(None);
            }
        }
        None => return Ok(None),
    };
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
    let mut inventory_addition_lines: Vec<InvoiceLineRow> = Vec::new();
    let mut inventory_reduction_lines: Vec<InvoiceLineRow> = Vec::new();
    let mut stock_lines: Vec<StockLineRow> = Vec::new();
    let mut stocktake_line_updates: Vec<StocktakeLineRow> = Vec::new();
    let mut location_movements: Vec<LocationMovementRow> = Vec::new();

    for stocktake_line in stocktake_lines {
        let StockLineJob {
            stock_line,
            invoice_line,
            stocktake_line,
            location_movement,
        } = if let Some(ref stock_line) = stocktake_line.stock_line {
            // adjust existing stock line
            generate_stock_line_update(
                connection,
                store_id,
                &inventory_addition_id,
                &inventory_reduction_id,
                &stocktake_line,
                stock_line,
            )?
        } else {
            // create new stock line
            generate_new_stock_line(connection, store_id, &inventory_addition_id, stocktake_line)?
        };
        stock_lines.push(stock_line);
        if let Some(shipment_line) = invoice_line {
            if shipment_line.r#type == InvoiceLineType::StockIn {
                inventory_addition_lines.push(shipment_line)
            } else {
                inventory_reduction_lines.push(shipment_line)
            }
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
        status: InvoiceStatus::Verified,
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
        inventory_adjustment_lines: [inventory_addition_lines, inventory_reduction_lines].concat(),
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
            let result = generate(ctx, input, existing, stocktake_lines, status_changed)?;

            // write data to the DB
            // write new stock lines
            let stock_line_repo = StockLineRowRepository::new(connection);
            for stock_line in result.stock_lines {
                stock_line_repo.upsert_one(&stock_line)?;
            }
            // write updated stocktake lines
            let stocktake_line_repo = StocktakeLineRowRepository::new(connection);
            for stocktake_line in result.stocktake_lines {
                stocktake_line_repo.upsert_one(&stocktake_line)?;
            }
            // write inventory adjustment
            if let Some(inventory_addition) = result.inventory_addition {
                let shipment_repo = InvoiceRowRepository::new(connection);
                shipment_repo.upsert_one(&inventory_addition)?;
            }
            if let Some(inventory_reduction) = result.inventory_reduction {
                let shipment_repo = InvoiceRowRepository::new(connection);
                shipment_repo.upsert_one(&inventory_reduction)?;
            }
            // write inventory adjustment lines
            let shipment_line_repo = InvoiceLineRowRepository::new(connection);
            for line in result.inventory_adjustment_lines {
                shipment_line_repo.upsert_one(&line)?;
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
    use util::{inline_edit, inline_init};

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
        assert_eq!(stock_line.supplier_link_id, None);

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
