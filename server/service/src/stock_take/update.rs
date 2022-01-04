use chrono::Utc;
use domain::{name::NameFilter, EqualFilter, SimpleStringFilter};
use repository::{
    schema::{
        InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, InvoiceRowType,
        NumberRowType, StockLineRow, StockTakeRow, StockTakeStatus,
    },
    InvoiceLineRowRepository, InvoiceRepository, ItemRepository, NameQueryRepository,
    RepositoryError, StockLineRowRepository, StockTake, StockTakeLine, StockTakeLineFilter,
    StockTakeLineRepository, StockTakeRowRepository, StorageConnection,
};
use util::uuid::uuid;

use crate::{
    number::next_number, service_provider::ServiceContext, validate::check_store_id_matches,
};

use super::{
    query::get_stock_take,
    validate::{check_stock_take_exist, check_stock_take_not_finalized},
};

pub struct UpdateStockTakeInput {
    pub id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub status: Option<StockTakeStatus>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateStockTakeError {
    DatabaseError(RepositoryError),
    InternalError(String),
    InvalidStore,
    StockTakeDoesNotExist,
    CannotEditFinalised,
    /// Stock takes doesn't contain any lines
    NoLines,
    /// Holds list of affected stock take line ids
    SnapshotCountCurrentCountMismatch(Vec<String>),
}

fn check_snapshot_matches_current_count(
    stock_take_lines: &Vec<StockTakeLine>,
) -> Option<Vec<String>> {
    let mut mismatches = Vec::new();
    for line in stock_take_lines {
        let stock_line = match &line.stock_line {
            Some(stock_line) => stock_line,
            None => continue,
        };
        if line.line.snapshot_number_of_packs != stock_line.total_number_of_packs {
            mismatches.push(line.line.id.clone());
        }
    }
    if mismatches.len() > 0 {
        return Some(mismatches);
    }
    None
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateStockTakeInput,
) -> Result<(StockTakeRow, Vec<StockTakeLine>), UpdateStockTakeError> {
    let existing = match check_stock_take_exist(connection, &input.id)? {
        Some(existing) => existing,
        None => return Err(UpdateStockTakeError::StockTakeDoesNotExist),
    };
    if !check_stock_take_not_finalized(&existing.status) {
        return Err(UpdateStockTakeError::CannotEditFinalised);
    }
    if !check_store_id_matches(store_id, &existing.store_id) {
        return Err(UpdateStockTakeError::InvalidStore);
    }
    let stock_take_lines = StockTakeLineRepository::new(connection).query_by_filter(
        StockTakeLineFilter::new().stock_take_id(EqualFilter::equal_to(&input.id)),
    )?;

    if let Some(StockTakeStatus::Finalized) = input.status {
        if stock_take_lines.len() == 0 {
            return Err(UpdateStockTakeError::NoLines);
        }

        if let Some(mismatches) = check_snapshot_matches_current_count(&stock_take_lines) {
            return Err(UpdateStockTakeError::SnapshotCountCurrentCountMismatch(
                mismatches,
            ));
        }
    }

    Ok((existing, stock_take_lines))
}

struct StockTakeGenerateJob {
    stock_take: StockTakeRow,

    // new inventory adjustment
    inventory_adjustment: Option<InvoiceRow>,
    inventory_adjustment_lines: Vec<InvoiceLineRow>,

    // list of stock_line upserts
    stock_lines: Vec<StockLineRow>,
}

/// Returns new stock line and matching invoice line
fn generate_stock_line_update(
    connection: &StorageConnection,
    invoice_id: &str,
    stock_take_line: &StockTakeLine,
    stock_line: &StockLineRow,
) -> Result<(StockLineRow, Option<InvoiceLineRow>), UpdateStockTakeError> {
    let counted_number_of_packs = stock_take_line
        .line
        .counted_number_of_packs
        .unwrap_or(stock_take_line.line.snapshot_number_of_packs);
    let delta = counted_number_of_packs - stock_take_line.line.snapshot_number_of_packs;
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
        expiry_date: stock_line.expiry_date,
        on_hold: stock_line.on_hold,
        note: stock_line.note.clone(),
    };

    let item = match ItemRepository::new(connection).find_one_by_id(&stock_line.item_id)? {
        Some(item) => item,
        None => {
            return Err(UpdateStockTakeError::InternalError(format!(
                "Can't find item {} for new stock take line {}!",
                &stock_line.item_id, stock_take_line.line.id
            )))
        }
    };

    let quantiy_change = i32::abs(delta);
    let shipment_line = if quantiy_change > 0 {
        let line_type = if delta > 0 {
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
            number_of_packs: quantiy_change,
            note: stock_line.note.clone(),
        })
    } else {
        None
    };
    Ok((updated_line, shipment_line))
}

/// Returns new stock line and matching invoice line
fn generate_new_stock_line(
    connection: &StorageConnection,
    store_id: &str,
    invoice_id: &str,
    stock_take_line: &StockTakeLine,
) -> Result<(StockLineRow, Option<InvoiceLineRow>), UpdateStockTakeError> {
    let item_id = stock_take_line
        .line
        .item_id
        .clone()
        .ok_or(UpdateStockTakeError::InternalError(
            "Stock take line without stock line and without item id".to_string(),
        ))?
        .clone();

    let row = &stock_take_line.line;
    let pack_size = row.pack_size.unwrap_or(0);
    let cost_price_per_pack = row.cost_price_per_pack.unwrap_or(0.0);
    let sell_price_per_pack = row.sell_price_per_pack.unwrap_or(0.0);
    let counted_number_of_packs = stock_take_line.line.counted_number_of_packs.unwrap_or(0);
    let new_line = StockLineRow {
        id: uuid(),
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

    let item = match ItemRepository::new(connection).find_one_by_id(&item_id)? {
        Some(item) => item,
        None => {
            return Err(UpdateStockTakeError::InternalError(format!(
                "Can't find item {} for new stock take line {}!",
                &item_id, row.id
            )))
        }
    };
    let shipment_line = if counted_number_of_packs > 0 {
        Some(InvoiceLineRow {
            id: uuid(),
            r#type: InvoiceLineRowType::StockIn,
            invoice_id: invoice_id.to_string(),
            item_id: item_id,
            item_name: item.name,
            item_code: item.code,
            stock_line_id: Some(new_line.id.clone()),
            location_id: row.location_id.clone(),
            batch: row.batch.clone(),
            expiry_date: row.expiry_date,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            total_before_tax: 0.0,
            total_after_tax: 0.0,
            tax: None,
            number_of_packs: counted_number_of_packs,
            note: row.note.clone(),
        })
    } else {
        None
    };
    Ok((new_line, shipment_line))
}

fn generate(
    connection: &StorageConnection,
    input: UpdateStockTakeInput,
    existing: StockTakeRow,
    stock_take_lines: &Vec<StockTakeLine>,
    store_id: &str,
) -> Result<StockTakeGenerateJob, UpdateStockTakeError> {
    if input.status != Some(StockTakeStatus::Finalized) {
        // just update the existing stock take
        let stock_take = StockTakeRow {
            id: existing.id,
            store_id: existing.store_id,
            comment: input.comment.or(existing.comment),
            description: input.description.or(existing.description),
            status: input.status.unwrap_or(existing.status),
            created_datetime: existing.created_datetime,
            finalised_datetime: None,
            inventory_adjustment_id: None,
        };
        return Ok(StockTakeGenerateJob {
            stock_take,
            inventory_adjustment: None,
            inventory_adjustment_lines: vec![],
            stock_lines: vec![],
        });
    }

    // finalize the stock take
    let mut inventory_adjustment_lines: Vec<InvoiceLineRow> = Vec::new();
    let mut stock_lines: Vec<StockLineRow> = Vec::new();
    let shipment_id = uuid();
    for stock_take_line in stock_take_lines {
        let (stock_line, shipment_line) = if let Some(ref stock_line) = stock_take_line.stock_line {
            // adjust existing stock line
            generate_stock_line_update(connection, &shipment_id, stock_take_line, stock_line)?
        } else {
            // create new stock line
            generate_new_stock_line(connection, store_id, &shipment_id, stock_take_line)?
        };
        stock_lines.push(stock_line);
        if let Some(shipment_line) = shipment_line {
            inventory_adjustment_lines.push(shipment_line);
        }
    }

    // find inventory adjustment name:
    let name_result = NameQueryRepository::new(connection)
        .query_by_filter(NameFilter::new().code(SimpleStringFilter::equal_to("invad")))?;
    let invad_name = name_result
        .first()
        .ok_or(UpdateStockTakeError::InternalError(
            "Missing inventory adjustment name".to_string(),
        ))?;

    // create a shipment even if there are now shipment lines
    let now = Utc::now().naive_utc();
    let shipment = InvoiceRow {
        id: shipment_id,
        name_id: invad_name.id.to_owned(),
        store_id: store_id.to_string(),
        invoice_number: next_number(connection, &NumberRowType::InventoryAdjustment, store_id)?,
        r#type: InvoiceRowType::InventoryAdjustment,
        status: InvoiceRowStatus::Verified,
        on_hold: false,
        comment: None,
        their_reference: None,
        created_datetime: now.clone(),
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: Some(now.clone()),
        color: None,
    };

    let stock_take = StockTakeRow {
        id: existing.id,
        store_id: existing.store_id,
        comment: input.comment.or(existing.comment),
        description: input.description.or(existing.description),
        status: input.status.unwrap_or(existing.status),
        created_datetime: existing.created_datetime,
        finalised_datetime: Some(now),
        inventory_adjustment_id: Some(shipment.id.clone()),
    };

    Ok(StockTakeGenerateJob {
        stock_take,
        inventory_adjustment: Some(shipment),
        inventory_adjustment_lines,
        stock_lines,
    })
}

pub fn update_stock_take(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdateStockTakeInput,
) -> Result<StockTake, UpdateStockTakeError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            let stock_take_id = input.id.clone();
            let (existing, stock_take_lines) = validate(connection, store_id, &input)?;
            let result = generate(connection, input, existing, &stock_take_lines, store_id)?;

            // write data to the DB
            // write new stock lines
            let stock_line_repo = StockLineRowRepository::new(connection);
            for stock_line in result.stock_lines {
                stock_line_repo.upsert_one(&stock_line)?;
            }
            // write inventory adjustment
            if let Some(inventory_adjustment) = result.inventory_adjustment {
                let shipment_repo = InvoiceRepository::new(connection);
                shipment_repo.upsert_one(&inventory_adjustment)?;
            }
            let shipment_line_repo = InvoiceLineRowRepository::new(connection);
            for line in result.inventory_adjustment_lines {
                shipment_line_repo.upsert_one(&line)?;
            }
            StockTakeRowRepository::new(connection).upsert_one(&result.stock_take)?;

            // return the updated stock take
            let stock_take = get_stock_take(ctx, stock_take_id)?;
            stock_take.ok_or(UpdateStockTakeError::InternalError(
                "Failed to read the just inserted stock take!".to_string(),
            ))
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(result)
}

impl From<RepositoryError> for UpdateStockTakeError {
    fn from(error: RepositoryError) -> Self {
        UpdateStockTakeError::DatabaseError(error)
    }
}
