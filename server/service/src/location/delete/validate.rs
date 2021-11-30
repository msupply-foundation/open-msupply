use domain::{
    invoice_line::InvoiceLineFilter, location::DeleteLocation, stock_line::StockLineFilter,
};
use repository::{
    schema::LocationRow, InvoiceLineRepository, LocationRowRepository, StockLineRepository,
};

use crate::{
    service_provider::ServiceConnection,
    validate::{check_record_belongs_to_current_store, RecordDoesNotBelongToCurrentStore},
};

use super::DeleteLocationError;

pub fn validate(
    input: &DeleteLocation,
    connection: &ServiceConnection,
) -> Result<(), DeleteLocationError> {
    let location_row = check_location_exists(&input.id, connection)?;
    check_record_belongs_to_current_store(&location_row.store_id)?;
    check_location_is_empty(&input.id, connection)?;

    Ok(())
}

pub fn check_location_is_empty(
    id: &String,
    connection: &ServiceConnection,
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

pub fn check_location_exists(
    id: &str,
    connection: &ServiceConnection,
) -> Result<LocationRow, DeleteLocationError> {
    let location_option = LocationRowRepository::new(connection).find_one_by_id(id)?;

    if let Some(location) = location_option {
        Ok(location)
    } else {
        Err(DeleteLocationError::LocationDoesNotExist)
    }
}

impl From<RecordDoesNotBelongToCurrentStore> for DeleteLocationError {
    fn from(_: RecordDoesNotBelongToCurrentStore) -> Self {
        DeleteLocationError::LocationDoesNotBelongToCurrentStore
    }
}
