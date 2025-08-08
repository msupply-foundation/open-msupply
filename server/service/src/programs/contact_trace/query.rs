use repository::{
    contact_trace::{ContactTrace, ContactTraceFilter, ContactTraceRepository, ContactTraceSort},
    PaginationOption, RepositoryError,
};

use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
 

pub(crate) fn contact_traces(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<ContactTraceFilter>,
    sort: Option<ContactTraceSort>,
    allowed_ctx: Vec<String>,
) -> Result<ListResult<ContactTrace>, ListError> {
    // restrict query results to allowed entries
    let mut filter = filter.unwrap_or_default();
    filter.program_context_id = Some(
        filter
            .program_context_id
            .unwrap_or_default()
            .restrict_results(&allowed_ctx),
    );

    let pagination = get_pagination_or_default(pagination)?;
    let repository = ContactTraceRepository::new(&ctx.connection);
    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub(crate) fn contact_trace(
    ctx: &ServiceContext,
    mut filter: ContactTraceFilter,
    allowed_ctx: Vec<String>,
) -> Result<Option<ContactTrace>, RepositoryError> {
    // restrict query results to allowed entries
    filter.program_context_id = Some(
        filter
            .program_context_id
            .unwrap_or_default()
            .restrict_results(&allowed_ctx),
    );

    let repository = ContactTraceRepository::new(&ctx.connection);
    Ok(repository.query_by_filter(filter)?.pop())
}
