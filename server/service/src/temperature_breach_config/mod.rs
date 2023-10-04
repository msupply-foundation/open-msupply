use self::query::{get_temperature_breach_config, get_temperature_breach_configs};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::temperature_breach_config::{
    TemperatureBreachConfig, TemperatureBreachConfigFilter, TemperatureBreachConfigSort,
};
use repository::PaginationOption;

pub mod query;

pub trait TemperatureBreachConfigServiceTrait: Sync + Send {
    fn get_temperature_breach_configs(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<TemperatureBreachConfigFilter>,
        sort: Option<TemperatureBreachConfigSort>,
    ) -> Result<ListResult<TemperatureBreachConfig>, ListError> {
        get_temperature_breach_configs(ctx, pagination, filter, sort)
    }

    fn get_temperature_breach_config(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<TemperatureBreachConfig, SingleRecordError> {
        get_temperature_breach_config(ctx, id)
    }
}

pub struct TemperatureBreachConfigService {}
impl TemperatureBreachConfigServiceTrait for TemperatureBreachConfigService {}

#[cfg(test)]
mod tests;
