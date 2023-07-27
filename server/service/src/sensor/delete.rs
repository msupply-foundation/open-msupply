use super::validate::check_sensor_exists;
use crate::service_provider::ServiceContext;
//use repository::EqualFilter;
use repository::{
    SensorRowRepository, RepositoryError, StorageConnection,
    //StockLine, StockLineFilter, StockLineRepository, 
};
#[derive(PartialEq, Debug)]
pub struct SensorInUse {
//    pub stock_lines: Vec<StockLine>,
//    pub invoice_lines: Vec<InvoiceLine>,
}

#[derive(PartialEq, Debug)]
pub enum DeleteSensorError {
    SensorDoesNotExist,
    SensorDoesNotBelongToCurrentStore,
    SensorInUse(SensorInUse),
    DatabaseError(RepositoryError),
}

pub struct DeleteSensor {
    pub id: String,
}

pub fn delete_sensor(
    ctx: &ServiceContext,
    input: DeleteSensor,
) -> Result<String, DeleteSensorError> {
    let sensor_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;
            match SensorRowRepository::new(&connection).delete(&input.id) {
                Ok(_) => Ok(input.id),
                Err(err) => Err(DeleteSensorError::from(err)),
            }
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(sensor_id)
}

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &DeleteSensor,
) -> Result<(), DeleteSensorError> {
    let sensor_row = match check_sensor_exists(&input.id, connection)? {
        Some(sensor_row) => sensor_row,
        None => return Err(DeleteSensorError::SensorDoesNotExist),
    };
    if sensor_row.store_id != Some(store_id.to_string()) {
        return Err(DeleteSensorError::SensorDoesNotBelongToCurrentStore);
    }
    if let Some(sensor_in_use) = check_sensor_in_use(&input.id, connection)? {
        return Err(DeleteSensorError::SensorInUse(sensor_in_use));
    }

    Ok(())
}

pub fn check_sensor_in_use(
    _id: &str,
    _connection: &StorageConnection,
) -> Result<Option<SensorInUse>, RepositoryError> {
    //let stock_lines = StockLineRepository::new(connection).query_by_filter(
    //    StockLineFilter::new().location_id(EqualFilter::equal_to(id)),
    //    None,
    //)?;
    //let invoice_lines = InvoiceLineRepository::new(connection)
    //    .query_by_filter(InvoiceLineFilter::new().location_id(EqualFilter::equal_to(id)))?;

    //if stock_lines.len() > 0 || invoice_lines.len() > 0 {
    //    Ok(Some(LocationInUse {
    //        stock_lines,
    //        invoice_lines,
    //    }))
    //} else {
        Ok(None)
    //}
}

impl From<RepositoryError> for DeleteSensorError {
    fn from(error: RepositoryError) -> Self {
        DeleteSensorError::DatabaseError(error)
    }
}
