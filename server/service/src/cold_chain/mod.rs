use self::insert_temperature_log::{
    insert_temperature_log, InsertTemperatureLog, InsertTemperatureLogError,
};
use self::query_temperature_log::{get_temperature_log, get_temperature_logs};
use self::update_temperature_log::{
    update_temperature_log, UpdateTemperatureLog, UpdateTemperatureLogError,
};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::temperature_log::{TemperatureLog, TemperatureLogFilter, TemperatureLogSort};
use repository::{PaginationOption, StorageConnection};

pub mod insert_temperature_log;
pub mod query_temperature_log;
pub mod update_temperature_log;
mod validate;

pub trait TemperatureLogServiceTrait: Sync + Send {
    fn get_temperature_logs(
        &self,
        connection: &StorageConnection,
        pagination: Option<PaginationOption>,
        filter: Option<TemperatureLogFilter>,
        sort: Option<TemperatureLogSort>,
    ) -> Result<ListResult<TemperatureLog>, ListError> {
        get_temperature_logs(connection, pagination, filter, sort)
    }

    fn get_temperature_log(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<TemperatureLog, SingleRecordError> {
        get_temperature_log(ctx, id)
    }

    fn insert_temperature_log(
        &self,
        ctx: &ServiceContext,
        input: InsertTemperatureLog,
    ) -> Result<TemperatureLog, InsertTemperatureLogError> {
        insert_temperature_log(ctx, input)
    }

    fn update_temperature_log(
        &self,
        ctx: &ServiceContext,
        input: UpdateTemperatureLog,
    ) -> Result<TemperatureLog, UpdateTemperatureLogError> {
        update_temperature_log(ctx, input)
    }
}

pub struct TemperatureLogService {}
impl TemperatureLogServiceTrait for TemperatureLogService {}

#[cfg(test)]
mod tests;
