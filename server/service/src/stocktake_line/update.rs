use chrono::NaiveDate;
use repository::{
    schema::StocktakeLineRow, RepositoryError, StocktakeLine, StocktakeLineRowRepository,
    StorageConnection,
};

use crate::{
    service_provider::ServiceContext,
    stocktake::validate::{check_stocktake_exist, check_stocktake_not_finalised},
    stocktake_line::{
        query::get_stocktake_line,
        validate::{check_location_exists, check_stocktake_line_exist},
    },
    u32_to_i32,
    validate::check_store_id_matches,
};

pub struct UpdateStocktakeLineInput {
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
pub enum UpdateStocktakeLineError {
    DatabaseError(RepositoryError),
    InternalError(String),
    InvalidStore,
    StocktakeLineDoesNotExist,
    LocationDoesNotExist,
    CannotEditFinalised,
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateStocktakeLineInput,
) -> Result<StocktakeLineRow, UpdateStocktakeLineError> {
    let stocktake_line = match check_stocktake_line_exist(connection, &input.id)? {
        Some(stocktake_line) => stocktake_line,
        None => return Err(UpdateStocktakeLineError::StocktakeLineDoesNotExist),
    };
    let stocktake = match check_stocktake_exist(connection, &stocktake_line.stocktake_id)? {
        Some(stocktake) => stocktake,
        None => {
            return Err(UpdateStocktakeLineError::InternalError(
                "Orphan stocktake line!".to_string(),
            ))
        }
    };
    if !check_stocktake_not_finalised(&stocktake.status) {
        return Err(UpdateStocktakeLineError::CannotEditFinalised);
    }

    if !check_store_id_matches(store_id, &stocktake.store_id) {
        return Err(UpdateStocktakeLineError::InvalidStore);
    }

    if let Some(location_id) = &input.location_id {
        if !check_location_exists(connection, location_id)? {
            return Err(UpdateStocktakeLineError::LocationDoesNotExist);
        }
    }

    Ok(stocktake_line)
}

fn generate(
    existing: StocktakeLineRow,
    UpdateStocktakeLineInput {
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
    }: UpdateStocktakeLineInput,
) -> Result<StocktakeLineRow, UpdateStocktakeLineError> {
    Ok(StocktakeLineRow {
        id: existing.id,
        stocktake_id: existing.stocktake_id,
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

pub fn update_stocktake_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdateStocktakeLineInput,
) -> Result<StocktakeLine, UpdateStocktakeLineError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            let existing = validate(connection, store_id, &input)?;
            let new_stocktake_line = generate(existing, input)?;
            StocktakeLineRowRepository::new(&connection).upsert_one(&new_stocktake_line)?;

            let line = get_stocktake_line(ctx, new_stocktake_line.id)?;
            line.ok_or(UpdateStocktakeLineError::InternalError(
                "Failed to read the just inserted stocktake line!".to_string(),
            ))
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(result)
}

impl From<RepositoryError> for UpdateStocktakeLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateStocktakeLineError::DatabaseError(error)
    }
}
