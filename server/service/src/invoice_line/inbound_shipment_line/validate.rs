use repository::{
    InvoiceLineRow, LocationRowRepository, StockLineRow, StockLineRowRepository, StorageConnection,
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
) -> Result<bool, WithDBError<BatchIsReserved>> {
    if let Some(batch_id) = &line.stock_line_id {
        match StockLineRowRepository::new(connection).find_one_by_id(batch_id) {
            Ok(batch) => return check_batch_stock_reserved(line, batch),
            Err(error) => return Err(WithDBError::db(error)),
        };
    }

    return Ok(true);
}

pub fn check_batch_stock_reserved(
    line: &InvoiceLineRow,
    batch: StockLineRow,
) -> Result<bool, WithDBError<BatchIsReserved>> {
    if line.number_of_packs != batch.available_number_of_packs {
        return Ok(false);
    }
    Ok(true)
}

pub struct LocationDoesNotExist;

pub fn check_location_exists(
    location_id: &Option<String>,
    connection: &StorageConnection,
) -> Result<bool, WithDBError<LocationDoesNotExist>> {
    if let Some(location_id) = location_id {
        let location = LocationRowRepository::new(connection).find_one_by_id(location_id)?;
        if location.is_none() {
            return Ok(false);
        }
    }
    Ok(true)
}
