use self::{
    // no delete - temperature breaches can only be acknowledged
    insert::{insert_temperature_breach, InsertTemperatureBreach, InsertTemperatureBreachError},
    query::{get_temperature_breach, get_temperature_breachs},
    update::{update_temperature_breach, UpdateTemperatureBreach, UpdateTemperatureBreachError},
};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::temperature_breach::{TemperatureBreach, TemperatureBreachFilter, TemperatureBreachSort};
use repository::PaginationOption;

pub mod insert;
pub mod query;
pub mod update;
mod validate;

pub trait TemperatureBreachServiceTrait: Sync + Send {
    fn get_temperature_breachs(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<TemperatureBreachFilter>,
        sort: Option<TemperatureBreachSort>,
    ) -> Result<ListResult<TemperatureBreach>, ListError> {
        get_temperature_breachs(ctx, pagination, filter, sort)
    }

    fn get_temperature_breach(&self, ctx: &ServiceContext, id: String) -> Result<TemperatureBreach, SingleRecordError> {
        get_temperature_breach(ctx, id)
    }

    fn insert_temperature_breach(
        &self,
        ctx: &ServiceContext,
        input: InsertTemperatureBreach,
    ) -> Result<TemperatureBreach, InsertTemperatureBreachError> {
        insert_temperature_breach(ctx, input)
    }

    fn update_temperature_breach(
        &self,
        ctx: &ServiceContext,
        input: UpdateTemperatureBreach,
    ) -> Result<TemperatureBreach, UpdateTemperatureBreachError> {
        update_temperature_breach(ctx, input)
    }
}

pub struct TemperatureBreachService {}
impl TemperatureBreachServiceTrait for TemperatureBreachService {}

#[cfg(test)]
mod tests;
