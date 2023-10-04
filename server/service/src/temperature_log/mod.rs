use self::query::{get_temperature_log, get_temperature_logs};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::temperature_log::{TemperatureLog, TemperatureLogFilter, TemperatureLogSort};
use repository::PaginationOption;

pub mod query;

pub trait TemperatureLogServiceTrait: Sync + Send {
    fn get_temperature_logs(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<TemperatureLogFilter>,
        sort: Option<TemperatureLogSort>,
    ) -> Result<ListResult<TemperatureLog>, ListError> {
        get_temperature_logs(ctx, pagination, filter, sort)
    }

    fn get_temperature_log(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<TemperatureLog, SingleRecordError> {
        get_temperature_log(ctx, id)
    }
}

pub struct TemperatureLogService {}
impl TemperatureLogServiceTrait for TemperatureLogService {}

#[cfg(test)]
mod tests;
