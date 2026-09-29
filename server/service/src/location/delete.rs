use super::validate::check_location_exists;
use crate::service_provider::ServiceContext;
use repository::location::LocationFilter;
use repository::EqualFilter;
use repository::{
    InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, LocationRowRepository, RepositoryError,
    Sensor, SensorFilter, SensorRepository, StockLine, StockLineFilter, StockLineRepository,
    StorageConnection,
};

/// What is still pointing at a location, so a refusal can say so.
///
/// Every vector here is something the delete would otherwise hit as a raw
/// foreign-key violation. The list is not exhaustive — a stocktake line, a
/// temperature reading, a stock relocation and an item's default location all
/// reference a location too, and those still fail at the constraint. That case
/// is caught in `delete_location` and reported as this same error rather than
/// as a database fault.
#[derive(PartialEq, Debug, Default)]
pub struct LocationInUse {
    pub stock_lines: Vec<StockLine>,
    pub invoice_lines: Vec<InvoiceLine>,
    /// Cold-chain sensors assigned to the location. A sensor is the reference a
    /// user is most likely to have created from another screen entirely (Cold
    /// chain › Sensors), which is why it earns a check of its own rather than
    /// being left to the constraint.
    pub sensors: Vec<Sensor>,
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
                // A reference `check_location_in_use` doesn't know about still
                // stops the delete at the constraint. That is the location
                // being in use, not the server failing: reporting it as a
                // database error turned a foreseeable refusal into an
                // "Internal error" with a `FOREIGN KEY constraint failed` in
                // its details, which tells a user nothing they can act on.
                Err(RepositoryError::ForeignKeyViolation(_)) => {
                    Err(DeleteLocationError::LocationInUse(LocationInUse::default()))
                }
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
        StockLineFilter::new().location_id(EqualFilter::equal_to(id.to_string())),
        None,
    )?;
    let invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new().location_id(EqualFilter::equal_to(id.to_string())),
    )?;
    let sensors = SensorRepository::new(connection).query_by_filter(
        SensorFilter::new()
            .location(LocationFilter::new().id(EqualFilter::equal_to(id.to_string()))),
    )?;

    if !stock_lines.is_empty() || !invoice_lines.is_empty() || !sensors.is_empty() {
        Ok(Some(LocationInUse {
            stock_lines,
            invoice_lines,
            sensors,
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
