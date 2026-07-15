use crate::common::{check_stock_line_exists, CommonStockLineError};
use repository::{
    LocationRowRepository, RepositoryError, StockLine, StockLineRow, StorageConnection,
};
use util::EPSILON;

pub struct LineMovement {
    pub stock_line_id: String,
    pub number_of_packs: f64,
    pub destination_location_id: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum ValidateMovementError {
    StockLineDoesNotExist,
    NotThisStoreStockLine,
    SourceLocationOnHold(String),
    DestinationLocationOnHold(String),
    DestinationLocationDoesNotExist,
    NotThisStoreLocation,
    IncorrectLocationType,
    NotEnoughStock(String),
    InvalidNumberOfPacks,
    SourceAndDestinationLocationSame,
    DatabaseError(RepositoryError),
}

pub fn validate_line_movement(
    connection: &StorageConnection,
    store_id: &str,
    movement: &LineMovement,
) -> Result<StockLineRow, ValidateMovementError> {
    use ValidateMovementError::*;

    let StockLine {
        stock_line_row,
        item_row,
        location_row,
        ..
    } = check_stock_line_exists(connection, store_id, &movement.stock_line_id).map_err(|err| {
        match err {
            CommonStockLineError::DatabaseError(RepositoryError::NotFound) => StockLineDoesNotExist,
            CommonStockLineError::StockLineDoesNotBelongToStore => NotThisStoreStockLine,
            CommonStockLineError::DatabaseError(error) => DatabaseError(error),
        }
    })?;

    if let Some(source_location) = &location_row {
        if source_location.on_hold {
            return Err(SourceLocationOnHold(source_location.id.clone()));
        }
    }

    if movement.number_of_packs < 1.0 {
        return Err(InvalidNumberOfPacks);
    }
    if movement.number_of_packs > stock_line_row.available_number_of_packs + EPSILON {
        return Err(NotEnoughStock(stock_line_row.id.clone()));
    }

    if let Some(destination_location_id) = &movement.destination_location_id {
        if location_row.as_ref().map(|l| &l.id) == Some(destination_location_id) {
            return Err(SourceAndDestinationLocationSame);
        }

        let destination = LocationRowRepository::new(connection)
            .find_one_by_id(destination_location_id)?
            .ok_or(DestinationLocationDoesNotExist)?;
        if destination.store_id != store_id {
            return Err(NotThisStoreLocation);
        }
        if destination.on_hold {
            return Err(DestinationLocationOnHold(destination.id.clone()));
        }
        if let Some(restricted_type) = &item_row.restricted_location_type_id {
            if destination.location_type_id.as_ref() != Some(restricted_type) {
                return Err(IncorrectLocationType);
            }
        }
    }

    Ok(stock_line_row)
}

impl From<RepositoryError> for ValidateMovementError {
    fn from(error: RepositoryError) -> Self {
        ValidateMovementError::DatabaseError(error)
    }
}
