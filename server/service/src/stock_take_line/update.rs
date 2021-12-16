use repository::{
    schema::StockTakeLineRow, RepositoryError, StockTakeLine, StockTakeLineRowRepository,
    StorageConnection,
};

use crate::{
    service_provider::ServiceContext, stock_take::validate::check_stock_take_exist,
    validate::check_store_id_matches,
};

use super::{
    query::get_stock_take_line,
    validate::{check_location_exists, check_stock_line_exist, check_stock_take_line_exist},
};

pub struct UpdateStockTakeLineInput {
    pub id: String,
    pub stock_line_id: Option<String>,
    pub location_id: Option<String>,
    pub batch: Option<String>,
    pub comment: Option<String>,
    pub cost_price_pack: Option<f64>,
    pub sell_price_pack: Option<f64>,
    pub snapshot_number_of_packs: Option<i32>,
    pub counted_number_of_packs: Option<i32>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateStockTakeLineError {
    DatabaseError(RepositoryError),
    InternalError(String),
    InvalidStockTakeLineId,
    InvalidStoreId,
    InvalidStockLineId,
    InvalidLocationId,
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateStockTakeLineInput,
) -> Result<StockTakeLineRow, UpdateStockTakeLineError> {
    let stock_take_line = match check_stock_take_line_exist(connection, &input.id)? {
        Some(stock_take_line) => stock_take_line,
        None => return Err(UpdateStockTakeLineError::InvalidStockTakeLineId),
    };
    let stock_take = match check_stock_take_exist(connection, &stock_take_line.stock_take_id)? {
        Some(stock_take) => stock_take,
        None => {
            return Err(UpdateStockTakeLineError::InternalError(
                "Orphan stock take line!".to_string(),
            ))
        }
    };
    if !check_store_id_matches(store_id, &stock_take.store_id) {
        return Err(UpdateStockTakeLineError::InvalidStoreId);
    }

    if let Some(stock_line_id) = &input.stock_line_id {
        if !check_stock_line_exist(connection, stock_line_id)? {
            return Err(UpdateStockTakeLineError::InvalidStockLineId);
        }
    }

    if let Some(location_id) = &input.location_id {
        if !check_location_exists(connection, location_id)? {
            return Err(UpdateStockTakeLineError::InvalidLocationId);
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
        batch,
        comment,
        cost_price_pack,
        sell_price_pack,
        snapshot_number_of_packs,
        counted_number_of_packs,
    }: UpdateStockTakeLineInput,
) -> StockTakeLineRow {
    StockTakeLineRow {
        id: existing.id,
        stock_take_id: existing.stock_take_id,
        stock_line_id: stock_line_id.unwrap_or(existing.stock_line_id),
        location_id: location_id.or(existing.location_id),
        batch: batch.or(existing.batch),
        comment: comment.or(existing.comment),
        cost_price_pack: cost_price_pack.unwrap_or(existing.cost_price_pack),
        sell_price_pack: sell_price_pack.unwrap_or(existing.sell_price_pack),
        snapshot_number_of_packs: snapshot_number_of_packs
            .unwrap_or(existing.snapshot_number_of_packs),
        counted_number_of_packs: counted_number_of_packs
            .unwrap_or(existing.counted_number_of_packs),
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
            let new_stock_take_line = generate(existing, input);
            StockTakeLineRowRepository::new(&connection).upsert_one(&new_stock_take_line)?;

            let line = get_stock_take_line(ctx, new_stock_take_line.id)
                .map_err(UpdateStockTakeLineError::from)?;
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
