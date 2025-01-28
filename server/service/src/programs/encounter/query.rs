use repository::{
    Encounter, EncounterFilter, EncounterRepository, EncounterSort, PaginationOption,
    RepositoryError,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub(crate) fn encounters(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<EncounterFilter>,
    sort: Option<EncounterSort>,
    allowed_ctx: Vec<String>,
) -> Result<ListResult<Encounter>, ListError> {
    // restrict query results to allowed entries
    let mut filter = filter.unwrap_or_default();
    filter.program_context_id = Some(
        filter
            .program_context_id
            .unwrap_or_default()
            .restrict_results(&allowed_ctx),
    );

    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = EncounterRepository::new(&ctx.connection);
    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub(crate) fn encounter(
    ctx: &ServiceContext,
    mut filter: EncounterFilter,
    allowed_ctx: Vec<String>,
) -> Result<Option<Encounter>, RepositoryError> {
    // restrict query results to allowed entries
    filter.program_context_id = Some(
        filter
            .program_context_id
            .unwrap_or_default()
            .restrict_results(&allowed_ctx),
    );

    let repository = EncounterRepository::new(&ctx.connection);
    Ok(repository.query_by_filter(filter)?.pop())
}
