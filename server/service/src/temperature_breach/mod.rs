use self::query::{get_temperature_breach, get_temperature_breachs};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::temperature_breach::{
    TemperatureBreach, TemperatureBreachFilter, TemperatureBreachSort,
};
use repository::PaginationOption;

pub mod query;

pub trait TemperatureBreachServiceTrait: Sync + Send {
    fn get_temperature_breaches(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<TemperatureBreachFilter>,
        sort: Option<TemperatureBreachSort>,
    ) -> Result<ListResult<TemperatureBreach>, ListError> {
        get_temperature_breaches(ctx, pagination, filter, sort)
    }

    fn get_temperature_breach(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<TemperatureBreach, SingleRecordError> {
        get_temperature_breach(ctx, id)
    }
}

pub struct TemperatureBreachService {}
impl TemperatureBreachServiceTrait for TemperatureBreachService {}

#[cfg(test)]
mod tests;
