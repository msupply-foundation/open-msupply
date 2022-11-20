use repository::{
    Pagination, ProgramEnrolment, ProgramEnrolmentFilter, ProgramEnrolmentRepository,
    ProgramEnrolmentSortField, RepositoryError, Sort,
};

use crate::service_provider::ServiceContext;

pub(crate) fn program_enrolment(
    ctx: &ServiceContext,
    mut filter: ProgramEnrolmentFilter,
    allowed_docs: Vec<String>,
) -> Result<Option<ProgramEnrolment>, RepositoryError> {
    // restrict query results to allowed entries
    filter.r#type = Some(
        filter
            .r#type
            .unwrap_or_default()
            .restrict_results(&allowed_docs),
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
    allowed_docs: Vec<String>,
) -> Result<Vec<ProgramEnrolment>, RepositoryError> {
    // restrict query results to allowed entries
    let mut filter = filter.unwrap_or(ProgramEnrolmentFilter::new());
    filter.r#type = Some(
        filter
            .r#type
            .unwrap_or_default()
            .restrict_results(&allowed_docs),
    );

    ProgramEnrolmentRepository::new(&ctx.connection).query(pagination, Some(filter), sort)
}
