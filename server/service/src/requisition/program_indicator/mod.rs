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
        include_inactive: bool,
    ) -> Result<Vec<ProgramIndicator>, RepositoryError> {
        program_indicators(connection, pagination, sort, filter, include_inactive)
    }
}

pub struct ProgramIndicatorService {}
impl ProgramIndicatorServiceTrait for ProgramIndicatorService {}
