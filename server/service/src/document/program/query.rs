use repository::{
    Pagination, Program, ProgramFilter, ProgramRepository, ProgramSortField, RepositoryError, Sort,
};

use crate::service_provider::ServiceContext;

pub(crate) fn get_patient_programs(
    ctx: &ServiceContext,
    pagination: Pagination,
    sort: Option<Sort<ProgramSortField>>,
    filter: Option<ProgramFilter>,
) -> Result<Vec<Program>, RepositoryError> {
    ProgramRepository::new(&ctx.connection).query(pagination, filter, sort)
}
