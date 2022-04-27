use repository::{
    db_diesel::InvoiceLineRow, schema::StockLineRow, LocationRowRepository, StockLineRowRepository,
    StorageConnection,
};

use crate::WithDBError;

pub struct PackSizeBelowOne;

pub fn check_pack_size(pack_size_option: Option<u32>) -> Result<(), PackSizeBelowOne> {
    if let Some(pack_size) = pack_size_option {
        if pack_size < 1 {
            return Err(PackSizeBelowOne {});
        }
    }
    Ok(())
}

pub struct BatchIsReserved;

pub fn check_batch(
    line: &InvoiceLineRow,
    connection: &StorageConnection,
) -> Result<(), WithDBError<BatchIsReserved>> {
    if let Some(batch_id) = &line.stock_line_id {
        match StockLineRowRepository::new(connection).find_one_by_id(batch_id) {
            Ok(batch) => return check_batch_stock_reserved(line, batch),
            Err(error) => return Err(WithDBError::db(error)),
        };
    }

    return Ok(());
}

pub fn check_batch_stock_reserved(
    line: &InvoiceLineRow,
    batch: StockLineRow,
) -> Result<(), WithDBError<BatchIsReserved>> {
    if line.number_of_packs != batch.available_number_of_packs {
        Err(WithDBError::err(BatchIsReserved))
    } else {
        Ok(())
    }
}

pub struct LocationDoesNotExist;

pub fn check_location_exists(
    location_id: &Option<String>,
    connection: &StorageConnection,
) -> Result<(), WithDBError<LocationDoesNotExist>> {
    match location_id {
        Some(location_id) => {
            let location = LocationRowRepository::new(connection)
                .find_one_by_id(&location_id)
                .map_err(WithDBError::db)?;

            match location {
                Some(_) => Ok(()),
                None => Err(WithDBError::err(LocationDoesNotExist)),
            }
        }
        None => Ok(()),
    }
}
