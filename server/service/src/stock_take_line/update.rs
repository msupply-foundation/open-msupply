use chrono::NaiveDate;
use repository::{
    schema::StockTakeLineRow, RepositoryError, StockTakeLine, StockTakeLineRowRepository,
    StorageConnection,
};

use crate::{
    service_provider::ServiceContext,
    stock_take::validate::{check_stock_take_exist, check_stock_take_not_finalised},
    u32_to_i32,
    validate::check_store_id_matches,
};

use super::{
    query::get_stock_take_line,
    validate::{check_location_exists, check_stock_take_line_exist},
};

pub struct UpdateStockTakeLineInput {
    pub id: String,
    pub location_id: Option<String>,
    pub comment: Option<String>,
    pub snapshot_number_of_packs: Option<u32>,
    pub counted_number_of_packs: Option<u32>,

    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: Option<u32>,
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
    LocationDoesNotExist,
    CannotEditFinalised,
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
    if !check_stock_take_not_finalised(&stock_take.status) {
        return Err(UpdateStockTakeLineError::CannotEditFinalised);
    }

    if !check_store_id_matches(store_id, &stock_take.store_id) {
        return Err(UpdateStockTakeLineError::InvalidStore);
    }

    if let Some(location_id) = &input.location_id {
        if !check_location_exists(connection, location_id)? {
            return Err(UpdateStockTakeLineError::LocationDoesNotExist);
        }
    }

    Ok(stock_take_line)
}

fn generate(
    existing: StockTakeLineRow,
    UpdateStockTakeLineInput {
        id: _,
        location_id,
        comment,
        snapshot_number_of_packs,
        counted_number_of_packs,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
    }: UpdateStockTakeLineInput,
) -> Result<StockTakeLineRow, UpdateStockTakeLineError> {
    Ok(StockTakeLineRow {
        id: existing.id,
        stock_take_id: existing.stock_take_id,
        stock_line_id: existing.stock_line_id,
        location_id: location_id.or(existing.location_id),
        comment: comment.or(existing.comment),

        snapshot_number_of_packs: snapshot_number_of_packs
            .map(u32_to_i32)
            .unwrap_or(existing.snapshot_number_of_packs),
        counted_number_of_packs: counted_number_of_packs
            .map(u32_to_i32)
            .or(existing.counted_number_of_packs),

        item_id: existing.item_id,
        expiry_date: expiry_date.or(existing.expiry_date),
        batch: batch.or(existing.batch),
        pack_size: pack_size.map(u32_to_i32).or(existing.pack_size),
        cost_price_per_pack: cost_price_per_pack.or(existing.cost_price_per_pack),
        sell_price_per_pack: sell_price_per_pack.or(existing.sell_price_per_pack),
        note: note.or(existing.note),
    })
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
