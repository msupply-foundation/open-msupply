use repository::{
    PaginationOption, Patient, PatientFilter, PatientRepository, PatientSort, RepositoryError,
};

use crate::{
    ListResult, get_default_pagination_unlimited, i64_to_u32, service_provider::ServiceContext,
};

pub fn get_patients(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<PatientFilter>,
    sort: Option<PatientSort>,
    allowed_ctx: Option<&[String]>,
) -> Result<ListResult<Patient>, RepositoryError> {
    get_patients_with_count_limit(ctx, pagination, filter, sort, allowed_ctx, None)
}

/// As `get_patients`, but with `count_limit` set the count stops there (see
/// `PatientRepository::count_up_to`).
pub fn get_patients_with_count_limit(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<PatientFilter>,
    sort: Option<PatientSort>,
    allowed_ctx: Option<&[String]>,
    count_limit: Option<u32>,
) -> Result<ListResult<Patient>, RepositoryError> {
    let pagination = get_default_pagination_unlimited(pagination);
    let repository = PatientRepository::new(&ctx.connection);

    let rows = repository.query(pagination, filter.clone(), sort, allowed_ctx)?;
    let count = match count_limit {
        Some(limit) => repository.count_up_to(filter, allowed_ctx, limit)?,
        None => repository.count(filter, allowed_ctx)?,
    };

    Ok(ListResult {
        rows,
        count: i64_to_u32(count),
    })
}
