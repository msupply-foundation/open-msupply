use self::insert::{
    insert_temperature_breach, InsertTemperatureBreach, InsertTemperatureBreachError,
};
use self::query::{get_temperature_breach, temperature_breaches};
use self::update::{
    update_temperature_breach, UpdateTemperatureBreach, UpdateTemperatureBreachError,
};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::temperature_breach::{
    TemperatureBreach, TemperatureBreachFilter, TemperatureBreachSort,
};
use repository::{PaginationOption, StorageConnection};

pub mod insert;
pub mod query;
pub mod update;
mod validate;

pub trait TemperatureBreachServiceTrait: Sync + Send {
    fn temperature_breaches(
        &self,
        connection: &StorageConnection,
        pagination: Option<PaginationOption>,
        filter: Option<TemperatureBreachFilter>,
        sort: Option<TemperatureBreachSort>,
    ) -> Result<ListResult<TemperatureBreach>, ListError> {
        temperature_breaches(connection, pagination, filter, sort)
    }

    fn get_temperature_breach(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<TemperatureBreach, SingleRecordError> {
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
