use chrono::{NaiveDate, Utc};
use repository::{
    LocationMovementRow, LocationMovementRowRepository, RepositoryError, StockLine, StockLineRow,
    StockLineRowRepository, StorageConnection,
};
use util::uuid::uuid;

use crate::{
    service_provider::ServiceContext,
    stock_line::validate::{check_location_exists, check_stock_line_exists, check_store},
    SingleRecordError,
};

use super::query::get_stock_line;

#[derive(Default, Debug, Clone, PartialEq)]
pub struct UpdateStockLine {
    pub id: String,
    pub location_id: Option<String>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub on_hold: Option<bool>,
    pub batch: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateStockLineError {
    DatabaseError(RepositoryError),
    StockDoesNotBelongToStore,
    StockDoesNotExist,
    LocationDoesNotExist,
    UpdatedStockNotFound,
}

pub fn update_stock_line(
    ctx: &ServiceContext,
    input: UpdateStockLine,
) -> Result<StockLine, UpdateStockLineError> {
    use UpdateStockLineError::*;

    let result = ctx
        .connection
        .transaction_sync(|connection| {
            let existing = validate(connection, &ctx.store_id, &input)?;
            let (new_stock_line, location_movements) =
                generate(ctx.store_id.clone(), existing, input)?;
            StockLineRowRepository::new(&connection).upsert_one(&new_stock_line)?;

            if let Some(location_movements) = location_movements {
                for movement in location_movements {
                    LocationMovementRowRepository::new(connection).upsert_one(&movement)?;
                }
            }

            get_stock_line(ctx, new_stock_line.id).map_err(|error| match error {
                SingleRecordError::DatabaseError(error) => DatabaseError(error),
                SingleRecordError::NotFound(_) => UpdatedStockNotFound,
            })
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(result)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateStockLine,
) -> Result<StockLineRow, UpdateStockLineError> {
    use UpdateStockLineError::*;

    let stock_line = check_stock_line_exists(connection, &input.id)?.ok_or(StockDoesNotExist)?;

    if !check_store(&stock_line, store_id) {
        return Err(StockDoesNotBelongToStore);
    };
    if let Some(location_id) = input.location_id.clone() {
        if !check_location_exists(connection, &location_id)? {
            return Err(LocationDoesNotExist);
        }
    }

    Ok(stock_line)
}

fn generate(
    store_id: String,
    mut existing: StockLineRow,
    UpdateStockLine {
        id: _,
        location_id,
        cost_price_per_pack,
        sell_price_per_pack,
        expiry_date,
        batch,
        on_hold,
    }: UpdateStockLine,
) -> Result<(StockLineRow, Option<Vec<LocationMovementRow>>), UpdateStockLineError> {
    existing.location_id = location_id.clone().or(existing.location_id);
    existing.batch = batch.or(existing.batch);
    existing.cost_price_per_pack = cost_price_per_pack.unwrap_or(existing.cost_price_per_pack);
    existing.sell_price_per_pack = sell_price_per_pack.unwrap_or(existing.sell_price_per_pack);
    existing.expiry_date = expiry_date.or(existing.expiry_date);
    existing.on_hold = on_hold.unwrap_or(existing.on_hold);

    let location_movements = if location_id != existing.location_id {
        Some(vec![
            LocationMovementRow {
                id: uuid(),
                store_id: store_id.clone(),
                stock_line_id: existing.id.clone(),
                location_id: existing.location_id.clone(),
                enter_datetime: None,
                exit_datetime: Some(Utc::now().naive_utc()),
            },
            LocationMovementRow {
                id: uuid(),
                store_id: store_id,
                stock_line_id: existing.id.clone(),
                location_id,
                enter_datetime: Some(Utc::now().naive_utc()),
                exit_datetime: None,
            },
        ])
    } else {
        None
    };

    Ok((existing, location_movements))
}

impl From<RepositoryError> for UpdateStockLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateStockLineError::DatabaseError(error)
    }
}
