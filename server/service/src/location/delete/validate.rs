use domain::{
    invoice_line::InvoiceLineFilter, location::DeleteLocation, stock_line::StockLineFilter,
};
use repository::{InvoiceLineRepository, StockLineRepository, StorageConnection};

use crate::{
    location::validate::{check_location_exists, LocationDoesNotExist},
    validate::{check_record_belongs_to_current_store, RecordDoesNotBelongToCurrentStore},
};

use super::DeleteLocationError;

pub fn validate(
    input: &DeleteLocation,
    connection: &StorageConnection,
) -> Result<(), DeleteLocationError> {
    let location_row = check_location_exists(&input.id, connection)?;
    check_record_belongs_to_current_store(&location_row.store_id, &connection)?;
    check_location_is_empty(&input.id, connection)?;

    Ok(())
}

pub fn check_location_is_empty(
    id: &String,
    connection: &StorageConnection,
) -> Result<(), DeleteLocationError> {
    let stock_lines = StockLineRepository::new(connection)
        .query_by_filter(StockLineFilter::new().location_id(|f| f.equal_to(id)))?;
    let invoice_lines = InvoiceLineRepository::new(connection)
        .query_by_filter(InvoiceLineFilter::new().location_id(|f| f.equal_to(id)))?;

    if stock_lines.len() > 0 || invoice_lines.len() > 0 {
        Err(DeleteLocationError::LocationInUse {
            stock_lines,
            invoice_lines,
        })
    } else {
        Ok(())
    }
}

impl From<LocationDoesNotExist> for DeleteLocationError {
    fn from(_: LocationDoesNotExist) -> Self {
        DeleteLocationError::LocationDoesNotExist
    }
}

impl From<RecordDoesNotBelongToCurrentStore> for DeleteLocationError {
    fn from(_: RecordDoesNotBelongToCurrentStore) -> Self {
        DeleteLocationError::LocationDoesNotBelongToCurrentStore
    }
}
