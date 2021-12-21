use chrono::NaiveDate;
use repository::{
    schema::StockTakeLineRow, RepositoryError, StockTakeLine, StockTakeLineRowRepository,
    StorageConnection,
};

use crate::{
    service_provider::ServiceContext,
    stock_take::validate::{check_stock_take_exist, check_stock_take_not_finalized},
    validate::check_store_id_matches,
};

use super::{
    query::get_stock_take_line,
    validate::{
        check_item_exists, check_location_exists, check_stock_line_exists,
        check_stock_take_line_exist,
    },
};

pub struct UpdateStockTakeLineInput {
    pub id: String,
    pub stock_line_id: Option<String>,
    pub location_id: Option<String>,
    pub comment: Option<String>,
    pub snapshot_number_of_packs: Option<i32>,
    pub counted_number_of_packs: Option<i32>,

    pub item_id: Option<String>,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: Option<i32>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub note: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateStockTakeLineError {
    DatabaseError(RepositoryError),
    InternalError(String),
    InvalidStore,
    StockTakeLineDoesNotExist,
    StockLineDoesNotExist,
    LocationDoesNotExist,
    CannotEditFinalised,
    /// Either stock take line xor item must be set
    StockTakeLineXOrItem,
    ItemDoesNotExist,
}

fn check_stock_line_xor_item(input: &UpdateStockTakeLineInput) -> bool {
    if input.stock_line_id.is_some() && input.item_id.is_some() {
        return false;
    }
    true
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateStockTakeLineInput,
) -> Result<StockTakeLineRow, UpdateStockTakeLineError> {
    let stock_take_line = match check_stock_take_line_exist(connection, &input.id)? {
        Some(stock_take_line) => stock_take_line,
        None => return Err(UpdateStockTakeLineError::StockTakeLineDoesNotExist),
    };
    let stock_take = match check_stock_take_exist(connection, &stock_take_line.stock_take_id)? {
        Some(stock_take) => stock_take,
        None => {
            return Err(UpdateStockTakeLineError::InternalError(
                "Orphan stock take line!".to_string(),
            ))
        }
    };
    if !check_stock_take_not_finalized(&stock_take.status) {
        return Err(UpdateStockTakeLineError::CannotEditFinalised);
    }

    if !check_store_id_matches(store_id, &stock_take.store_id) {
        return Err(UpdateStockTakeLineError::InvalidStore);
    }

    if !check_stock_line_xor_item(input) {
        return Err(UpdateStockTakeLineError::StockTakeLineXOrItem);
    }

    if let Some(location_id) = &input.location_id {
        if !check_location_exists(connection, location_id)? {
            return Err(UpdateStockTakeLineError::LocationDoesNotExist);
        }
    }

    if let Some(stock_line_id) = &input.stock_line_id {
        if !check_stock_line_exists(connection, stock_line_id)? {
            return Err(UpdateStockTakeLineError::StockLineDoesNotExist);
        }
    }
    if let Some(item_id) = &input.item_id {
        if !check_item_exists(connection, item_id)? {
            return Err(UpdateStockTakeLineError::ItemDoesNotExist);
        }
    }

    Ok(stock_take_line)
}

fn generate(
    existing: StockTakeLineRow,
    UpdateStockTakeLineInput {
        id: _,
        stock_line_id,
        location_id,
        comment,
        snapshot_number_of_packs,
        counted_number_of_packs,
        item_id,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
    }: UpdateStockTakeLineInput,
) -> Result<StockTakeLineRow, UpdateStockTakeLineError> {
    let update_stock_line_id = if existing.stock_line_id != stock_line_id {
        stock_line_id
    } else {
        None
    };
    let update_item_id = if existing.item_id != item_id {
        item_id
    } else {
        None
    };
    match (update_stock_line_id, update_item_id) {
        // normal update: (stock_line nor item_id have changed):
        (None, None) => Ok(StockTakeLineRow {
            id: existing.id,
            stock_take_id: existing.stock_take_id,
            stock_line_id: existing.stock_line_id,
            location_id: location_id.or(existing.location_id),
            comment: comment.or(existing.comment),

            snapshot_number_of_packs: snapshot_number_of_packs
                .unwrap_or(existing.snapshot_number_of_packs),
            counted_number_of_packs: counted_number_of_packs.or(existing.counted_number_of_packs),

            item_id: existing.item_id,
            expiry_date: expiry_date.or(existing.expiry_date),
            batch: batch.or(existing.batch),
            pack_size: pack_size.or(existing.pack_size),
            cost_price_per_pack: cost_price_per_pack.or(existing.cost_price_per_pack),
            sell_price_per_pack: sell_price_per_pack.or(existing.sell_price_per_pack),
            note: note.or(existing.note),
        }),
        // Reference to existing stock_line has been removed and now refers to an item (create new stock line):
        (None, Some(item_id)) => Ok(StockTakeLineRow {
            id: existing.id,
            stock_take_id: existing.stock_take_id,
            stock_line_id: None,
            location_id: location_id.or(existing.location_id),
            comment: comment.or(existing.comment),

            snapshot_number_of_packs: snapshot_number_of_packs
                .unwrap_or(existing.snapshot_number_of_packs),
            counted_number_of_packs: counted_number_of_packs.or(existing.counted_number_of_packs),

            item_id: Some(item_id),
            expiry_date: expiry_date.or(None),
            batch: batch.or(None),
            pack_size: pack_size.or(None),
            cost_price_per_pack: cost_price_per_pack.or(None),
            sell_price_per_pack: sell_price_per_pack.or(None),
            note: note.or(None),
        }),
        // Reference to an item (create new stock line) has been removed and now refers to existing stock line:
        (Some(stock_line_id), None) => Ok(StockTakeLineRow {
            id: existing.id,
            stock_take_id: existing.stock_take_id,
            stock_line_id: Some(stock_line_id),
            location_id: location_id.or(existing.location_id),
            comment: comment.or(existing.comment),

            snapshot_number_of_packs: snapshot_number_of_packs
                .unwrap_or(existing.snapshot_number_of_packs),
            counted_number_of_packs: counted_number_of_packs.or(existing.counted_number_of_packs),

            item_id: None,
            expiry_date: expiry_date.or(None),
            batch: batch.or(None),
            pack_size: pack_size.or(None),
            cost_price_per_pack: cost_price_per_pack.or(None),
            sell_price_per_pack: sell_price_per_pack.or(None),
            note: note.or(None),
        }),
        // Validate should have caught this case:
        (Some(_), Some(_)) => Err(UpdateStockTakeLineError::InternalError(
            "Stock line and item id specified at the same time".to_string(),
        )),
    }
}

pub fn update_stock_take_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdateStockTakeLineInput,
) -> Result<StockTakeLine, UpdateStockTakeLineError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            let existing = validate(connection, store_id, &input)?;
            let new_stock_take_line = generate(existing, input)?;
            StockTakeLineRowRepository::new(&connection).upsert_one(&new_stock_take_line)?;

            let line = get_stock_take_line(ctx, new_stock_take_line.id)?;
            line.ok_or(UpdateStockTakeLineError::InternalError(
                "Failed to read the just inserted stock take line!".to_string(),
            ))
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(result)
}

impl From<RepositoryError> for UpdateStockTakeLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateStockTakeLineError::DatabaseError(error)
    }
}
