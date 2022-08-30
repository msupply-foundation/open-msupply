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
) -> Result<ListResult<Encounter>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = EncounterRepository::new(&ctx.connection);
    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub(crate) fn encounter(
    ctx: &ServiceContext,
    filter: EncounterFilter,
) -> Result<Option<Encounter>, RepositoryError> {
    let repository = EncounterRepository::new(&ctx.connection);
    Ok(repository.query_by_filter(filter)?.pop())
}
