use self::query_demographic_indicator::{get_demographic_indicator, get_demographic_indicators};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};

use repository::demographic_indicator::{
    DemographicIndicator, DemographicIndicatorFilter, DemographicIndicatorSort,
};
use repository::{PaginationOption, StorageConnection};

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
}

pub struct DemographicService {}

impl DemographicServiceTrait for DemographicService {}
