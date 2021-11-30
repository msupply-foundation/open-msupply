use super::{ListError, ListResult};
use crate::{service_provider::ServiceConnection, SingleRecordError};
use domain::{
    location::{Location, LocationFilter, LocationSort},
    PaginationOption,
};

pub mod delete;
pub mod insert;
pub mod query;
pub mod update;
mod validate;

pub trait LocationQueryServiceTrait {
    fn get_locations(
        &self,
        pagination: Option<PaginationOption>,
        filter: Option<LocationFilter>,
        sort: Option<LocationSort>,
    ) -> Result<ListResult<Location>, ListError>;

    fn get_location(&self, id: String) -> Result<Location, SingleRecordError>;
}

pub struct LocationQueryService<'a>(pub ServiceConnection<'a>);
