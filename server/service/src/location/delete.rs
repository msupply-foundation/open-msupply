use super::validate::check_location_exists;
use crate::service_provider::ServiceContext;
use repository::EqualFilter;
use repository::{
    InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, LocationRowRepository, RepositoryError,
    StockLine, StockLineFilter, StockLineRepository, StorageConnection,
};
#[derive(PartialEq, Debug)]
pub struct LocationInUse {
    pub stock_lines: Vec<StockLine>,
    pub invoice_lines: Vec<InvoiceLine>,
}

#[derive(PartialEq, Debug)]
pub enum DeleteLocationError {
    LocationDoesNotExist,
    LocationDoesNotBelongToCurrentStore,
    LocationInUse(LocationInUse),
    DatabaseError(RepositoryError),
}

pub struct DeleteLocation {
    pub id: String,
}

pub fn delete_location(
    ctx: &ServiceContext,
    input: DeleteLocation,
) -> Result<String, DeleteLocationError> {
    let location_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;
            match LocationRowRepository::new(connection).delete(&input.id) {
                Ok(_) => Ok(input.id),
                Err(err) => Err(DeleteLocationError::from(err)),
            }
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(location_id)
}

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &DeleteLocation,
) -> Result<(), DeleteLocationError> {
    let location_row = match check_location_exists(&input.id, connection)? {
        Some(location_row) => location_row,
        None => return Err(DeleteLocationError::LocationDoesNotExist),
    };
    if location_row.store_id != store_id {
        return Err(DeleteLocationError::LocationDoesNotBelongToCurrentStore);
    }
    if let Some(location_in_use) = check_location_in_use(&input.id, connection)? {
        return Err(DeleteLocationError::LocationInUse(location_in_use));
    }

    Ok(())
}

pub fn check_location_in_use(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<LocationInUse>, RepositoryError> {
    let stock_lines = StockLineRepository::new(connection).query_by_filter(
        StockLineFilter::new().location_id(EqualFilter::equal_to(id)),
        None,
    )?;
    let invoice_lines = InvoiceLineRepository::new(connection)
        .query_by_filter(InvoiceLineFilter::new().location_id(EqualFilter::equal_to(id)))?;

    if !stock_lines.is_empty() || !invoice_lines.is_empty() {
        Ok(Some(LocationInUse {
            stock_lines,
            invoice_lines,
        }))
    } else {
        Ok(None)
    }
}

impl From<RepositoryError> for DeleteLocationError {
    fn from(error: RepositoryError) -> Self {
        DeleteLocationError::DatabaseError(error)
    }
}
