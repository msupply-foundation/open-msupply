use super::{ListError, ListResult};
use crate::SingleRecordError;
use domain::{
    location::{Location, LocationFilter, LocationSort},
    PaginationOption,
};
use repository::StorageConnectionManager;

pub mod query;

pub trait LocationServiceQuery: Sync + Send {
    fn get_locations(
        &self,
        pagination: Option<PaginationOption>,
        filter: Option<LocationFilter>,
        sort: Option<LocationSort>,
    ) -> Result<ListResult<Location>, ListError>;

    fn get_location(&self, id: String) -> Result<Location, SingleRecordError>;
}

pub struct LocationService {
    connection_manager: StorageConnectionManager,
}

impl LocationService {
    pub fn new(connection_manager: StorageConnectionManager) -> Self {
        LocationService { connection_manager }
    }
}
