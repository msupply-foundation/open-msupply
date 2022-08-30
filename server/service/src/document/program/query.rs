use repository::{
    Pagination, ProgramEnrolment, ProgramEnrolmentFilter, ProgramEnrolmentRepository,
    ProgramEnrolmentSortField, RepositoryError, Sort,
};

use crate::service_provider::ServiceContext;

pub(crate) fn program_enrolment(
    ctx: &ServiceContext,
    filter: ProgramEnrolmentFilter,
) -> Result<Option<ProgramEnrolment>, RepositoryError> {
    Ok(ProgramEnrolmentRepository::new(&ctx.connection)
        .query_by_filter(filter)?
        .pop())
}

pub(crate) fn program_enrolments(
    ctx: &ServiceContext,
    pagination: Pagination,
    sort: Option<Sort<ProgramEnrolmentSortField>>,
    filter: Option<ProgramEnrolmentFilter>,
) -> Result<Vec<ProgramEnrolment>, RepositoryError> {
    ProgramEnrolmentRepository::new(&ctx.connection).query(pagination, filter, sort)
}
