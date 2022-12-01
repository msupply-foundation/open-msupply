use chrono::{NaiveDate, Utc};
use repository::{
    ActivityLogType, DatetimeFilter, EqualFilter, InvoiceLineRow, InvoiceLineRowRepository,
    InvoiceLineRowType, InvoiceRow, InvoiceRowRepository, InvoiceRowStatus, InvoiceRowType,
    ItemRowRepository, LocationMovementFilter, LocationMovementRepository, LocationMovementRow,
    LocationMovementRowRepository, NameRowRepository, NumberRowType, RepositoryError, StockLineRow,
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

fn load_stocktake_lines(
    connection: &StorageConnection,
    stocktake_id: &str,
) -> Result<Vec<StocktakeLine>, RepositoryError> {
    StocktakeLineRepository::new(connection).query_by_filter(
        StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to(stocktake_id)),
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
    let stocktake_lines = load_stocktake_lines(connection, &input.id)?;

    let status_changed = input.status.is_some();
    if status_changed {
        if stocktake_lines.len() == 0 {
            return Err(UpdateStocktakeError::NoLines);
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

struct StocktakeGenerateJob {
    stocktake: StocktakeRow,
    // list of stocktake lines to be updated, e.g. to link newly created stock_lines during
    // stocktake finialisation.
    stocktake_lines: Vec<StocktakeLineRow>,

    // new inventory adjustment
    inventory_adjustment: Option<InvoiceRow>,
    inventory_adjustment_lines: Vec<InvoiceLineRow>,

    // list of stock_line upserts
    stock_lines: Vec<StockLineRow>,

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
    invoice_id: &str,
    stocktake_line: &StocktakeLine,
    stock_line: &StockLineRow,
) -> Result<StockLineJob, UpdateStocktakeError> {
    let counted_number_of_packs = stocktake_line
        .line
        .counted_number_of_packs
        .unwrap_or(stocktake_line.line.snapshot_number_of_packs);
    let delta = counted_number_of_packs - stocktake_line.line.snapshot_number_of_packs;
    let updated_line = StockLineRow {
        id: stock_line.id.clone(),
        item_id: stock_line.item_id.clone(),
        store_id: stock_line.store_id.clone(),
        location_id: stock_line.location_id.clone(),
        batch: stock_line.batch.clone(),
        pack_size: stock_line.pack_size,
        cost_price_per_pack: stock_line.cost_price_per_pack,
        sell_price_per_pack: stock_line.sell_price_per_pack,
        // TODO might get negative!
        available_number_of_packs: stock_line.available_number_of_packs + delta,
        total_number_of_packs: stock_line.total_number_of_packs + delta,
        expiry_date: stocktake_line.line.expiry_date.or(stock_line.expiry_date),
        on_hold: stock_line.on_hold,
        note: stock_line.note.clone(),
    };

    let item = match ItemRowRepository::new(connection).find_one_by_id(&stock_line.item_id)? {
        Some(item) => item,
        None => {
            return Err(UpdateStocktakeError::InternalError(format!(
                "Can't find item {} for existing stocktake line {}!",
                &stock_line.item_id, stocktake_line.line.id
            )))
        }
    };

    let quantity_change = f64::abs(delta);
    let shipment_line = if quantity_change > 0.0 {
        let line_type = if delta > 0.0 {
            InvoiceLineRowType::StockIn
        } else {
            InvoiceLineRowType::StockOut
        };
        Some(InvoiceLineRow {
            id: uuid(),
            r#type: line_type,
            invoice_id: invoice_id.to_string(),
            item_id: stock_line.item_id.clone(),
            item_name: item.name,
            item_code: item.code,
            stock_line_id: Some(stock_line.id.clone()),
            location_id: stock_line.location_id.clone(),
            batch: stock_line.batch.clone(),
            expiry_date: stock_line.expiry_date,
            pack_size: stock_line.pack_size,
            cost_price_per_pack: stock_line.cost_price_per_pack,
            sell_price_per_pack: stock_line.sell_price_per_pack,
            total_before_tax: 0.0,
            total_after_tax: 0.0,
            tax: None,
            number_of_packs: quantity_change,
            note: stock_line.note.clone(),
        })
    } else {
        None
    };

    let location_movement = if counted_number_of_packs <= 0.0 {
        generate_exit_location_movements(connection, &store_id, updated_line.clone())?
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
    invoice_id: &str,
    stocktake_line: StocktakeLine,
) -> Result<StockLineJob, UpdateStocktakeError> {
    let counted_number_of_packs = stocktake_line.line.counted_number_of_packs.unwrap_or(0.0);
    let row = stocktake_line.line;
    let pack_size = row.pack_size.unwrap_or(0);
    let cost_price_per_pack = row.cost_price_per_pack.unwrap_or(0.0);
    let sell_price_per_pack = row.sell_price_per_pack.unwrap_or(0.0);
    let stock_line_id = uuid();

    // update the stock_line_id in the existing stocktake_line
    let updated_stocktake_line = inline_edit(&row, |mut l: StocktakeLineRow| {
        l.stock_line_id = Some(stock_line_id.clone());
        l
    });

    let item_id = row.item_id;
    let new_line = StockLineRow {
        id: stock_line_id,
        item_id: item_id.clone(),
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
    };

    let item = match ItemRowRepository::new(connection).find_one_by_id(&item_id)? {
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
            r#type: InvoiceLineRowType::StockIn,
            invoice_id: invoice_id.to_string(),
            item_id,
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
            tax: None,
            number_of_packs: counted_number_of_packs,
            note: row.note,
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
                        .store_id(EqualFilter::equal_to(&store_id)),
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

    let stocktake = inline_edit(&existing, |mut u: StocktakeRow| {
        u.description = input_description.or(u.description);
        u.comment = input_comment.or(u.comment);
        u.is_locked = input_is_locked.unwrap_or(false);
        u.stocktake_date = input_stocktake_date.or(u.stocktake_date);
        u
    });

    if !is_finalised {
        // just update the existing stocktake
        return Ok(StocktakeGenerateJob {
            stocktake,
            stocktake_lines: vec![],
            inventory_adjustment: None,
            inventory_adjustment_lines: vec![],
            stock_lines: vec![],
            location_movements: None,
        });
    }

    let now = Utc::now().naive_utc();
    let inventory_adjustment_id = uuid();
    let stocktake = inline_edit(&existing, |mut u: StocktakeRow| {
        u.status = StocktakeStatus::Finalised;
        u.finalised_datetime = Some(now);
        u.inventory_adjustment_id = Some(inventory_adjustment_id.clone());
        u
    });

    // finalise the stocktake
    let mut inventory_adjustment_lines: Vec<InvoiceLineRow> = Vec::new();
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
                &inventory_adjustment_id,
                &stocktake_line,
                stock_line,
            )?
        } else {
            // create new stock line
            generate_new_stock_line(
                connection,
                &store_id,
                &inventory_adjustment_id,
                stocktake_line,
            )?
        };
        stock_lines.push(stock_line);
        if let Some(shipment_line) = invoice_line {
            inventory_adjustment_lines.push(shipment_line);
        }
        if let Some(stocktake_line) = stocktake_line {
            stocktake_line_updates.push(stocktake_line);
        }
        if let Some(location_movement) = location_movement {
            location_movements.push(location_movement);
        }
    }

    // find inventory adjustment name:
    let invalid_name = NameRowRepository::new(connection)
        .find_one_by_code(INVENTORY_ADJUSTMENT_NAME_CODE)?
        .ok_or(UpdateStocktakeError::InternalError(
            "Missing inventory adjustment name".to_string(),
        ))?;

    // create a shipment even if there are no shipment lines

    let shipment = InvoiceRow {
        id: inventory_adjustment_id,
        user_id: Some(user_id.to_string()),
        name_id: invalid_name.id,
        store_id: store_id.to_string(),
        invoice_number: next_number(connection, &NumberRowType::InventoryAdjustment, store_id)?,
        name_store_id: None,
        r#type: InvoiceRowType::InventoryAdjustment,
        status: InvoiceRowStatus::Verified,
        // Default
        transport_reference: None,
        on_hold: false,
        comment: None,
        their_reference: None,
        created_datetime: now,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: Some(now),
        colour: None,
        requisition_id: None,
        linked_invoice_id: None,
    };

    Ok(StocktakeGenerateJob {
        stocktake,
        stocktake_lines: stocktake_line_updates,
        inventory_adjustment: Some(shipment),
        inventory_adjustment_lines,
        stock_lines,
        location_movements: Some(location_movements),
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
            if let Some(inventory_adjustment) = result.inventory_adjustment {
                let shipment_repo = InvoiceRowRepository::new(connection);
                shipment_repo.upsert_one(&inventory_adjustment)?;
            }
            let shipment_line_repo = InvoiceLineRowRepository::new(connection);
            for line in result.inventory_adjustment_lines {
                shipment_line_repo.upsert_one(&line)?;
            }
            StocktakeRowRepository::new(connection).upsert_one(&result.stocktake)?;

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
            mock_locked_stocktake, mock_stock_line_a, mock_stock_line_b, mock_stocktake_a,
            mock_stocktake_finalised_without_lines, mock_stocktake_full_edit,
            mock_stocktake_line_a, mock_stocktake_line_new_stock_line,
            mock_stocktake_line_stock_deficit, mock_stocktake_line_stock_surplus,
            mock_stocktake_new_stock_line, mock_stocktake_no_count_change, mock_stocktake_no_lines,
            mock_stocktake_stock_deficit, mock_stocktake_stock_surplus, mock_store_a,
            MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository, InvoiceLineRowType, StockLineRowRepository, StocktakeLine,
        StocktakeLineRowRepository, StocktakeRepository, StocktakeRow,
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
        let (_, connection, connection_manager, _) =
            setup_all("update_stocktake", MockDataInserts::all()).await;

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
        let shipment = InvoiceLineRowRepository::new(&context.connection)
            .find_many_by_invoice_id(&result.inventory_adjustment_id.unwrap())
            .unwrap()
            .pop()
            .unwrap();
        assert_eq!(shipment.r#type, InvoiceLineRowType::StockIn);
        assert_eq!(shipment.number_of_packs, surplus_amount);

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
        let shipment = InvoiceLineRowRepository::new(&context.connection)
            .find_many_by_invoice_id(&result.inventory_adjustment_id.unwrap())
            .unwrap()
            .pop()
            .unwrap();
        assert_eq!(shipment.r#type, InvoiceLineRowType::StockOut);
        assert_eq!(shipment.number_of_packs, f64::abs(deficit_amount));

        // success: no count change should not generate shipment line
        let stocktake = mock_stocktake_no_count_change();
        let result = service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id = stocktake.id;
                    i.status = Some(UpdateStocktakeStatus::Finalised);
                }),
            )
            .unwrap();
        let shipment_lines = InvoiceLineRowRepository::new(&context.connection)
            .find_many_by_invoice_id(&result.inventory_adjustment_id.unwrap())
            .unwrap()
            .pop();
        assert_eq!(shipment_lines, None);

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
                    stocktake_date: Some(NaiveDate::from_ymd(2019, 03, 20)),
                    is_locked: Some(false),
                },
            )
            .unwrap();

        assert_eq!(
            result,
            inline_edit(&stocktake, |mut i: StocktakeRow| {
                i.comment = Some("comment_1".to_string());
                i.description = Some("description_1".to_string());
                i.stocktake_date = Some(NaiveDate::from_ymd(2019, 03, 20));
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
            .find_many_by_invoice_id(&result.inventory_adjustment_id.unwrap())
            .unwrap()
            .pop()
            .unwrap();
        let stock_line = StockLineRowRepository::new(&context.connection)
            .find_one_by_id(&shipment_line.stock_line_id.unwrap())
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

        // assert stocktake_line has been updated
        let updated_stocktake_line = StocktakeLineRowRepository::new(&context.connection)
            .find_one_by_id(&stocktake_line.id)
            .unwrap()
            .unwrap();
        assert_eq!(updated_stocktake_line.stock_line_id, Some(stock_line.id));
    }
}
