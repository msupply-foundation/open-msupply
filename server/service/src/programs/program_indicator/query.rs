use repository::{
    Pagination, ProgramIndicator, ProgramIndicatorFilter, ProgramIndicatorRepository,
    ProgramIndicatorSort, RepositoryError,
};

use crate::service_provider::ServiceContext;

pub fn program_indicator(
    ctx: &ServiceContext,
    filter: ProgramIndicatorFilter,
) -> Result<Option<ProgramIndicator>, RepositoryError> {
    Ok(ProgramIndicatorRepository::new(&ctx.connection)
        .query_by_filter(filter)?
        .pop())
}

pub fn program_indicators(
    ctx: &ServiceContext,
    pagination: Pagination,
    sort: Option<ProgramIndicatorSort>,
    filter: Option<ProgramIndicatorFilter>,
) -> Result<Vec<ProgramIndicator>, RepositoryError> {
    ProgramIndicatorRepository::new(&ctx.connection).query(pagination, filter, sort)
}
