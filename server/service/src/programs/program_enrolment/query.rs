use repository::{
    Pagination, ProgramEnrolment, ProgramEnrolmentFilter, ProgramEnrolmentRepository,
    ProgramEnrolmentSortField, RepositoryError, Sort,
};

use crate::service_provider::ServiceContext;

pub(crate) fn program_enrolment(
    ctx: &ServiceContext,
    mut filter: ProgramEnrolmentFilter,
    allowed_ctx: Vec<String>,
) -> Result<Option<ProgramEnrolment>, RepositoryError> {
    // restrict query results to allowed entries
    filter.context = Some(
        filter
            .context
            .unwrap_or_default()
            .restrict_results(&allowed_ctx),
    );

    Ok(ProgramEnrolmentRepository::new(&ctx.connection)
        .query_by_filter(filter)?
        .pop())
}

pub(crate) fn program_enrolments(
    ctx: &ServiceContext,
    pagination: Pagination,
    sort: Option<Sort<ProgramEnrolmentSortField>>,
    filter: Option<ProgramEnrolmentFilter>,
    allowed_ctx: Vec<String>,
) -> Result<Vec<ProgramEnrolment>, RepositoryError> {
    // restrict query results to allowed entries
    let mut filter = filter.unwrap_or(ProgramEnrolmentFilter::new());
    filter.context = Some(
        filter
            .context
            .unwrap_or_default()
            .restrict_results(&allowed_ctx),
    );

    ProgramEnrolmentRepository::new(&ctx.connection).query(pagination, Some(filter), sort)
}
