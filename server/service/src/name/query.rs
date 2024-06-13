use repository::{
    EqualFilter, Name, NameFilter, NameRepository, NameSort, NameType, PaginationOption,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_names(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<NameFilter>,
    sort: Option<NameSort>,
) -> Result<ListResult<Name>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = NameRepository::new(&ctx.connection);

    let filter = filter.unwrap_or_default();

    let type_filter = match filter.r#type.clone() {
        Some(filter_input) => EqualFilter::<NameType> {
            not_equal_to: Some(NameType::Patient),
            ..filter_input
        },
        None => NameType::Patient.not_equal_to(),
    };

    let filter = filter.r#type(type_filter);

    Ok(ListResult {
        rows: repository.query(store_id, pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(store_id, Some(filter))?),
    })
}
