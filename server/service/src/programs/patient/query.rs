use repository::{
    PaginationOption, Patient, PatientFilter, PatientRepository, PatientSort, RepositoryError,
};

use crate::{
    get_default_pagination_unlimited, i64_to_u32, service_provider::ServiceContext, ListResult,
};

pub fn get_patients(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<PatientFilter>,
    sort: Option<PatientSort>,
    allowed_ctx: Option<&[String]>,
) -> Result<ListResult<Patient>, RepositoryError> {
    let pagination = get_default_pagination_unlimited(pagination);
    let repository = PatientRepository::new(&ctx.connection);

    let rows = repository.query(store_id, pagination, filter.clone(), sort, allowed_ctx)?;

    Ok(ListResult {
        rows,
        count: i64_to_u32(repository.count(store_id, filter, allowed_ctx)?),
    })
}
