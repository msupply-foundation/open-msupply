use domain::{
    location::{Location, LocationFilter, LocationSort},
    Pagination, PaginationOption,
};
use repository::LocationRepository;

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};

use super::LocationQueryServiceTrait;

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;
pub struct LocationQueryService {}

impl LocationQueryServiceTrait for LocationQueryService {
    fn get_locations(
        &self,
        pagination: Option<PaginationOption>,
        filter: Option<LocationFilter>,
        sort: Option<LocationSort>,
        ctx: &ServiceContext,
    ) -> Result<ListResult<Location>, ListError> {
        let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
        let repository = LocationRepository::new(&ctx.connection);

        Ok(ListResult {
            rows: repository.query(pagination, filter.clone(), sort)?,
            count: i64_to_u32(repository.count(filter)?),
        })
    }

    fn get_location(
        &self,
        id: String,
        ctx: &ServiceContext,
    ) -> Result<Location, SingleRecordError> {
        let repository = LocationRepository::new(&ctx.connection);

        let mut result = repository.query(
            Pagination::one(),
            Some(LocationFilter::new().match_id(&id)),
            None,
        )?;

        if let Some(record) = result.pop() {
            Ok(record)
        } else {
            Err(SingleRecordError::NotFound(id))
        }
    }
}

#[cfg(test)]
mod tests;
