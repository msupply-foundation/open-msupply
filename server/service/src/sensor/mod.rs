use self::{
    query::{get_sensor, get_sensors},
    update::{update_sensor, UpdateSensor, UpdateSensorError},
};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::sensor::{Sensor, SensorFilter, SensorSort};
use repository::PaginationOption;

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
