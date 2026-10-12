use self::insert_temperature_log::{
    InsertTemperatureLog, InsertTemperatureLogError, insert_temperature_log,
};
use self::query_temperature_log::{get_temperature_log, get_temperature_logs};
use self::update_temperature_log::{
    UpdateTemperatureLog, UpdateTemperatureLogError, update_temperature_log,
};

use self::insert_temperature_breach::{
    InsertTemperatureBreach, InsertTemperatureBreachError, insert_temperature_breach,
};
use self::query_temperature_breach::{get_temperature_breach, temperature_breaches};
use self::update_temperature_breach::{
    UpdateTemperatureBreach, UpdateTemperatureBreachAcknowledgement, UpdateTemperatureBreachError,
    update_temperature_breach, update_temperature_breach_acknowledgement,
};
use super::{ListError, ListResult};
use crate::{SingleRecordError, service_provider::ServiceContext};
use repository::temperature_breach::{
    TemperatureBreach, TemperatureBreachFilter, TemperatureBreachSort,
};
use repository::temperature_log::{TemperatureLog, TemperatureLogFilter, TemperatureLogSort};
use repository::{PaginationOption, StorageConnection};

pub mod insert_temperature_breach;
pub mod insert_temperature_log;
pub mod query_temperature_breach;
pub mod query_temperature_log;
pub mod update_temperature_breach;
pub mod update_temperature_log;
mod validate;

pub trait ColdChainServiceTrait: Sync + Send {
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

    fn update_temperature_breach_acknowledgement(
        &self,
        ctx: &ServiceContext,
        input: UpdateTemperatureBreachAcknowledgement,
    ) -> Result<TemperatureBreach, UpdateTemperatureBreachError> {
        update_temperature_breach_acknowledgement(ctx, input)
    }
}

pub struct ColdChainService {}
impl ColdChainServiceTrait for ColdChainService {}
