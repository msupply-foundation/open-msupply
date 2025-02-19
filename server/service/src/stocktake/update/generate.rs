use chrono::Utc;
use repository::{
    location_movement::{LocationMovementFilter, LocationMovementRepository},
    ActivityLogType, CurrencyFilter, CurrencyRepository, DatetimeFilter, EqualFilter, InvoiceRow,
    InvoiceStatus, InvoiceType, LocationMovementRow, NameRowRepository, NumberRowType,
    RepositoryError, StockLineRow, StocktakeLine, StocktakeLineFilter, StocktakeLineRepository,
    StocktakeLineRow, StocktakeRow, StocktakeStatus, StorageConnection,
};
use util::{constants::INVENTORY_ADJUSTMENT_NAME_CODE, inline_edit, uuid::uuid};

use crate::{
    activity_log::activity_log_entry,
    invoice::inventory_adjustment::UpdateInventoryAdjustmentReason,
    invoice_line::{
        stock_in_line::{InsertStockInLine, StockInType},
        stock_out_line::{InsertStockOutLine, StockOutType},
    },
    number::next_number,
    service_provider::ServiceContext,
    NullableUpdate,
};

use super::{UpdateStocktake, UpdateStocktakeError};

#[derive(Default)]
pub struct StocktakeGenerateJob {
    pub stocktake: StocktakeRow,
    // list of stocktake lines to be updated, e.g. to link newly created stock_lines during
    // stocktake finalisation.
    pub stocktake_lines: Vec<StocktakeLineRow>,

    // new inventory adjustment
    pub inventory_addition: Option<InvoiceRow>,
    pub inventory_reduction: Option<InvoiceRow>,
    pub inventory_addition_lines: Vec<InsertStockInLine>,
    pub inventory_reduction_lines: Vec<InsertStockOutLine>,
    pub inventory_adjustment_reason_updates: Vec<UpdateInventoryAdjustmentReason>,

    // list of stock_line upserts
    pub stock_lines: Vec<StockLineRow>,

    pub stocktake_lines_to_trim: Option<Vec<StocktakeLineRow>>,
    pub location_movements: Option<Vec<LocationMovementRow>>,
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
    ctx: &ServiceContext,
    store_id: &str,
    inventory_addition_id: &str,
    inventory_reduction_id: &str,
    stocktake_line: &StocktakeLine,
    stock_line: &StockLineRow,
) -> Result<StockLineJob, UpdateStocktakeError> {
    let row = stocktake_line.line.to_owned();

    let counted_number_of_packs = match row.counted_number_of_packs {
        Some(counted_number_of_packs) => counted_number_of_packs,
        None => {
            return Ok(StockLineJob {
                stock_in_out_or_update: None,
                stocktake_line: None,
                location_movement: None,
                update_inventory_adjustment_reason: None,
            });
        }
    };

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

    // If item_variant_id is null on the stocktake_line, we need to set the stock_line item_variant_id to null too.
    // Without this, we'd wouldn't be able to clear it...
    let item_variant_id = stocktake_line.line.item_variant_id.clone();

    log_stock_changes(ctx, stock_line_row.clone(), row.clone())?;

    // If no change in stock quantity, we just update the stock line (no inventory adjustment)
    if delta == 0.0 {
        let updated_stock_line = StockLineRow {
            location_id: row.location_id,
            batch: row.batch,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            expiry_date,
            item_variant_id,
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
        row.inventory_adjustment_reason_id.clone(),
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
            item_variant_id: stock_line_row.item_variant_id,
            barcode: stock_line_row.barcode_id,
            // Default
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
            cost_price_per_pack: Some(cost_price_per_pack),
            sell_price_per_pack: Some(sell_price_per_pack),
            total_before_tax: None,
            tax_percentage: None,
            prescribed_quantity: None,
        })
    };

    // if reducing to 0, create movement to exit location
    let location_movement = if counted_number_of_packs == 0.0 {
        generate_exit_location_movements(&ctx.connection, store_id, stock_line.clone())?
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

fn log_stock_changes(
    ctx: &ServiceContext,
    existing: StockLineRow,
    new: StocktakeLineRow,
) -> Result<(), RepositoryError> {
    if existing.location_id != new.location_id {
        let previous_location = if let Some(location_id) = existing.location_id {
            Some(location_id)
        } else {
            Some("-".to_string())
        };

        activity_log_entry(
            ctx,
            ActivityLogType::StockLocationChange,
            Some(existing.id.to_owned()),
            previous_location,
            new.location_id,
        )?;
    }
    if existing.batch != new.batch {
        let previous_batch = if let Some(batch) = existing.batch {
            Some(batch)
        } else {
            Some("-".to_string())
        };

        activity_log_entry(
            ctx,
            ActivityLogType::StockBatchChange,
            Some(existing.id.to_owned()),
            previous_batch,
            new.batch,
        )?;
    }
    if let Some(cost_price_per_pack) = new.cost_price_per_pack {
        if existing.cost_price_per_pack != cost_price_per_pack {
            activity_log_entry(
                ctx,
                ActivityLogType::StockCostPriceChange,
                Some(existing.id.to_owned()),
                Some(existing.cost_price_per_pack.to_string()),
                Some(cost_price_per_pack.to_string()),
            )?;
        }
    }
    if let Some(sell_price_per_pack) = new.sell_price_per_pack {
        if existing.sell_price_per_pack != sell_price_per_pack {
            activity_log_entry(
                ctx,
                ActivityLogType::StockSellPriceChange,
                Some(existing.id.to_owned()),
                Some(existing.sell_price_per_pack.to_string()),
                Some(sell_price_per_pack.to_string()),
            )?;
        }
    }
    if existing.expiry_date != new.expiry_date {
        let previous_expiry_date = if let Some(expiry_date) = existing.expiry_date {
            Some(expiry_date.to_string())
        } else {
            Some("-".to_string())
        };

        activity_log_entry(
            ctx,
            ActivityLogType::StockExpiryDateChange,
            Some(existing.id.to_owned()),
            previous_expiry_date,
            new.expiry_date.map(|date| date.to_string()),
        )?;
    }

    Ok(())
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
        item_variant_id: stocktake_line.line.item_variant_id.clone(),
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
                        .store_id(EqualFilter::equal_to(store_id)),
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

pub fn generate(
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
                ctx,
                store_id,
                &inventory_addition_id,
                &inventory_reduction_id,
                &stocktake_line,
                stock_line,
            )?
        } else {
            // create new stock line
            generate_new_stock_line(store_id, &inventory_addition_id, &stocktake_line)?
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
        backdated_datetime: None,
        diagnosis_id: None,
        program_id: None,
        name_insurance_join_id: None,
        insurance_discount_amount: None,
        insurance_discount_percentage: None,
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
