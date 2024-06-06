use self::insert_demographic_indicator::{
    insert_demographic_indicator, InsertDemographicIndicator, InsertDemographicIndicatorError,
};

use self::insert_demographic_projection::{
    insert_demographic_projection, InsertDemographicProjection, InsertDemographicProjectionError,
};
use self::query_demographic_indicator::{get_demographic_indicator, get_demographic_indicators};
use self::update_demographic_indicator::{
    update_demographic_indicator, UpdateDemographicIndicator, UpdateDemographicIndicatorError,
};
use self::update_demographic_projection::{
    update_demographic_projection, UpdateDemographicProjection, UpdateDemographicProjectionError,
};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};

use repository::demographic_indicator::{
    DemographicIndicator, DemographicIndicatorFilter, DemographicIndicatorSort,
};
use repository::{
    DemographicIndicatorRow, DemographicProjectionRow, PaginationOption, StorageConnection,
};

pub mod insert_demographic_indicator;
pub mod insert_demographic_projection;
pub mod query_demographic_indicator;
pub mod query_demographic_projection;
pub mod update_demographic_indicator;
pub mod update_demographic_projection;
mod validate;

use self::query_demographic_projection::{get_demographic_projection, get_demographic_projections};

use repository::demographic_projection::{
    DemographicProjection, DemographicProjectionFilter, DemographicProjectionSort,
};

pub trait DemographicServiceTrait: Sync + Send {
    fn get_demographic_indicators(
        &self,
        connection: &StorageConnection,
        pagination: Option<PaginationOption>,
        filter: Option<DemographicIndicatorFilter>,
        sort: Option<DemographicIndicatorSort>,
    ) -> Result<ListResult<DemographicIndicator>, ListError> {
        get_demographic_indicators(connection, pagination, filter, sort)
    }

    fn get_demographic_indicator(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<DemographicIndicator, SingleRecordError> {
        get_demographic_indicator(ctx, id)
    }

    fn get_demographic_projections(
        &self,
        connection: &StorageConnection,
        pagination: Option<PaginationOption>,
        filter: Option<DemographicProjectionFilter>,
        sort: Option<DemographicProjectionSort>,
    ) -> Result<ListResult<DemographicProjection>, ListError> {
        get_demographic_projections(connection, pagination, filter, sort)
    }

    fn get_demographic_projection(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<DemographicProjection, SingleRecordError> {
        get_demographic_projection(ctx, id)
    }

    fn insert_demographic_indicator(
        &self,
        ctx: &ServiceContext,
        input: InsertDemographicIndicator,
    ) -> Result<DemographicIndicatorRow, InsertDemographicIndicatorError> {
        insert_demographic_indicator(ctx, input)
    }
    fn insert_demographic_projection(
        &self,
        ctx: &ServiceContext,
        input: InsertDemographicProjection,
    ) -> Result<DemographicProjectionRow, InsertDemographicProjectionError> {
        insert_demographic_projection(ctx, input)
    }

    fn update_demographic_indicator(
        &self,
        ctx: &ServiceContext,
        input: UpdateDemographicIndicator,
    ) -> Result<DemographicIndicatorRow, UpdateDemographicIndicatorError> {
        update_demographic_indicator(ctx, input)
    }

    fn update_demographic_projection(
        &self,
        ctx: &ServiceContext,
        input: UpdateDemographicProjection,
    ) -> Result<DemographicProjectionRow, UpdateDemographicProjectionError> {
        update_demographic_projection(ctx, input)
    }
}

pub struct DemographicService {}

impl DemographicServiceTrait for DemographicService {}

#[cfg(test)]
mod tests;
