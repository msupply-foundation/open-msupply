use self::{
    // no delete: sensors can't be deleted - just made inactive
    insert::{insert_sensor, InsertSensor, InsertSensorError},
    query::{get_sensor, get_sensors},
    update::{update_sensor, UpdateSensor, UpdateSensorError},
};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::{PaginationOption, Sensor, SensorFilter, SensorSort};

pub mod fridge_tag;
pub mod insert;
pub mod query;
pub mod update;
mod validate;

pub trait SensorServiceTrait: Sync + Send {
    fn get_sensors(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<SensorFilter>,
        sort: Option<SensorSort>,
    ) -> Result<ListResult<Sensor>, ListError> {
        get_sensors(ctx, pagination, filter, sort)
    }

    fn get_sensor(&self, ctx: &ServiceContext, id: String) -> Result<Sensor, SingleRecordError> {
        get_sensor(ctx, id)
    }

    fn insert_sensor(
        &self,
        ctx: &ServiceContext,
        input: InsertSensor,
    ) -> Result<Sensor, InsertSensorError> {
        insert_sensor(ctx, input)
    }

    fn update_sensor(
        &self,
        ctx: &ServiceContext,
        input: UpdateSensor,
    ) -> Result<Sensor, UpdateSensorError> {
        update_sensor(ctx, input)
    }
}

pub struct SensorService {}
impl SensorServiceTrait for SensorService {}

#[cfg(test)]
mod tests;
