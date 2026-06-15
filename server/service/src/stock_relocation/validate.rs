use repository::{
    LocationRowRepository, RepositoryError, StockLine, StockLineRow, StorageConnection,
};
use util::EPSILON;

use crate::common::{check_stock_line_exists, CommonStockLineError};

pub struct RelocationMovement {
    pub from_stock_line_id: String,
    pub from_number_of_packs: f64,
    pub to_location_id: Option<String>,
    pub to_pack_size: Option<f64>,
}

#[derive(Debug, PartialEq)]
pub enum ValidateMovementError {
    StockLineDoesNotExist,
    NotThisStoreStockLine,
    StockLineOnHold(String),
    LocationOnHold(String),
    ToLocationDoesNotExist,
    NotThisStoreLocation,
    NotEnoughStock(String),
    InvalidNumberOfPacks,
    InvalidPackSize,
    DatabaseError(RepositoryError),
}

pub fn validate_movement(
    connection: &StorageConnection,
    store_id: &str,
    movement: &RelocationMovement,
) -> Result<StockLineRow, ValidateMovementError> {
    use ValidateMovementError::*;

    let StockLine {
        stock_line_row,
        location_row,
        ..
    } = check_stock_line_exists(connection, store_id, &movement.from_stock_line_id).map_err(
        |err| match err {
            CommonStockLineError::DatabaseError(RepositoryError::NotFound) => StockLineDoesNotExist,
            CommonStockLineError::StockLineDoesNotBelongToStore => NotThisStoreStockLine,
            CommonStockLineError::DatabaseError(error) => DatabaseError(error),
        },
    )?;

    if stock_line_row.on_hold {
        return Err(StockLineOnHold(stock_line_row.id.clone()));
    }
    if let Some(location_row) = &location_row {
        if location_row.on_hold {
            return Err(LocationOnHold(location_row.id.clone()));
        }
    }

    if movement.from_number_of_packs <= 0.0 {
        return Err(InvalidNumberOfPacks);
    }
    if movement.from_number_of_packs > stock_line_row.available_number_of_packs + EPSILON {
        return Err(NotEnoughStock(stock_line_row.id.clone()));
    }
    if let Some(to_pack_size) = movement.to_pack_size {
        if to_pack_size <= 0.0 {
            return Err(InvalidPackSize);
        }
    }

    if let Some(to_location_id) = &movement.to_location_id {
        let to_location = LocationRowRepository::new(connection)
            .find_one_by_id(to_location_id)?
            .ok_or(ToLocationDoesNotExist)?;
        if to_location.store_id != store_id {
            return Err(NotThisStoreLocation);
        }
        if to_location.on_hold {
            return Err(LocationOnHold(to_location.id.clone()));
        }
    }

    Ok(stock_line_row)
}

impl From<RepositoryError> for ValidateMovementError {
    fn from(error: RepositoryError) -> Self {
        ValidateMovementError::DatabaseError(error)
    }
}
