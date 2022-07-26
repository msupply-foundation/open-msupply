use repository::{Program, ProgramFilter, ProgramRepository, RepositoryError};

use crate::service_provider::ServiceContext;

pub(crate) fn get_patient_programs(
    ctx: &ServiceContext,
    filter: Option<ProgramFilter>,
) -> Result<Vec<Program>, RepositoryError> {
    ProgramRepository::new(&ctx.connection).query_by_filter(filter.unwrap_or(ProgramFilter::new()))
}
