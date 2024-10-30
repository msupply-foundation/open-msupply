use query::program_indicator;
use query::program_indicators;
use repository::Pagination;
use repository::ProgramIndicator;
use repository::ProgramIndicatorFilter;
use repository::ProgramIndicatorSort;
use repository::RepositoryError;

use crate::service_provider::ServiceContext;

// use self::query::program_enrolment;
// use self::query::program_enrolments;
mod query;

pub trait ProgramIndicatorServiceTrait: Sync + Send {
    fn program_indicator(
        &self,
        ctx: &ServiceContext,
        filter: ProgramIndicatorFilter,
    ) -> Result<Option<ProgramIndicator>, RepositoryError> {
        program_indicator(ctx, filter)
    }

    fn program_indicators(
        &self,
        ctx: &ServiceContext,
        pagination: Pagination,
        sort: Option<ProgramIndicatorSort>,
        filter: Option<ProgramIndicatorFilter>,
    ) -> Result<Vec<ProgramIndicator>, RepositoryError> {
        program_indicators(ctx, pagination, sort, filter)
    }
}

pub struct ProgramIndicatorService {}
impl ProgramIndicatorServiceTrait for ProgramIndicatorService {}
