use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use domain::{
    location::{Location, LocationFilter, LocationSort},
    PaginationOption,
};

pub mod query;

pub trait LocationQueryServiceTrait: Sync + Send {
    fn get_locations(
        &self,
        pagination: Option<PaginationOption>,
        filter: Option<LocationFilter>,
        sort: Option<LocationSort>,
        ctx: &ServiceContext,
    ) -> Result<ListResult<Location>, ListError>;

    fn get_location(&self, id: String, ctx: &ServiceContext)
        -> Result<Location, SingleRecordError>;
}
