use std::collections::HashMap;

use query::program_indicators;
use query::ProgramIndicator;
use repository::Pagination;
use repository::ProgramIndicatorFilter;
use repository::ProgramIndicatorSort;
use repository::RepositoryError;
use repository::StorageConnection;
pub mod query;

pub trait ProgramIndicatorServiceTrait: Sync + Send {
    fn program_indicators(
        &self,
        connection: &StorageConnection,
        pagination: Pagination,
        sort: Option<ProgramIndicatorSort>,
        filter: Option<ProgramIndicatorFilter>,
    ) -> Result<HashMap<String, ProgramIndicator>, RepositoryError> {
        program_indicators(connection, pagination, sort, filter)
    }
}

pub struct ProgramIndicatorService {}
impl ProgramIndicatorServiceTrait for ProgramIndicatorService {}
