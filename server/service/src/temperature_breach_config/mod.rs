use self::{
    // no delete: temperature_breach_configs can't be deleted - just made inactive
    insert::{
        insert_temperature_breach_config, InsertTemperatureBreachConfig,
        InsertTemperatureBreachConfigError,
    },
    query::{get_temperature_breach_config, get_temperature_breach_configs},
    update::{
        update_temperature_breach_config, UpdateTemperatureBreachConfig,
        UpdateTemperatureBreachConfigError,
    },
};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::temperature_breach_config::{
    TemperatureBreachConfig, TemperatureBreachConfigFilter, TemperatureBreachConfigSort,
};
use repository::PaginationOption;

pub mod insert;
pub mod query;
pub mod update;
mod validate;

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

    fn insert_temperature_breach_config(
        &self,
        ctx: &ServiceContext,
        input: InsertTemperatureBreachConfig,
    ) -> Result<TemperatureBreachConfig, InsertTemperatureBreachConfigError> {
        insert_temperature_breach_config(ctx, input)
    }

    fn update_temperature_breach_config(
        &self,
        ctx: &ServiceContext,
        input: UpdateTemperatureBreachConfig,
    ) -> Result<TemperatureBreachConfig, UpdateTemperatureBreachConfigError> {
        update_temperature_breach_config(ctx, input)
    }
}

pub struct TemperatureBreachConfigService {}
impl TemperatureBreachConfigServiceTrait for TemperatureBreachConfigService {}

#[cfg(test)]
mod tests;
