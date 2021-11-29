use domain::{
    location::{Location, LocationFilter, LocationSort},
    PaginationOption,
};
use repository::LocationRepository;

use crate::{get_default_pagination, i64_to_u32, ListError, ListResult, SingleRecordError};

use super::{LocationQueryService, LocationQueryServiceTrait};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

impl<'a> LocationQueryServiceTrait for LocationQueryService<'a> {
    fn get_locations(
        &self,
        pagination: Option<PaginationOption>,
        filter: Option<LocationFilter>,
        sort: Option<LocationSort>,
    ) -> Result<ListResult<Location>, ListError> {
        let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
        let repository = LocationRepository::new(&self.0);

        Ok(ListResult {
            rows: repository.query(pagination, filter.clone(), sort)?,
            count: i64_to_u32(repository.count(filter)?),
        })
    }

    fn get_location(&self, id: String) -> Result<Location, SingleRecordError> {
        let repository = LocationRepository::new(&self.0);

        let mut result =
            repository.query_by_filter(LocationFilter::new().id(|f| f.equal_to(&id)))?;

        if let Some(record) = result.pop() {
            Ok(record)
        } else {
            Err(SingleRecordError::NotFound(id))
        }
    }
}

#[cfg(test)]
mod tests;
