use query::program_indicator;
use query::program_indicators;
use query::ProgramIndicator;
use repository::Pagination;
use repository::ProgramIndicatorFilter;
use repository::ProgramIndicatorSort;
use repository::RepositoryError;
use repository::StorageConnection;

// use self::query::program_enrolment;
// use self::query::program_enrolments;
pub mod query;

pub trait ProgramIndicatorServiceTrait: Sync + Send {
    fn program_indicator(
        &self,
        connection: &StorageConnection,
        filter: ProgramIndicatorFilter,
    ) -> Result<Option<ProgramIndicator>, RepositoryError> {
        program_indicator(connection, filter)
    }

    fn program_indicators(
        &self,
        connection: &StorageConnection,
        pagination: Pagination,
        sort: Option<ProgramIndicatorSort>,
        filter: Option<ProgramIndicatorFilter>,
    ) -> Result<Vec<ProgramIndicator>, RepositoryError> {
        program_indicators(connection, pagination, sort, filter)
    }
}

pub struct ProgramIndicatorService {}
impl ProgramIndicatorServiceTrait for ProgramIndicatorService {}
