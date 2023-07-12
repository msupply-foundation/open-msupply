use repository::{
    PaginationOption, Patient, PatientFilter, PatientRepository, PatientSort, RepositoryError,
};

use crate::{
    get_default_pagination_unlimited, i64_to_u32, service_provider::ServiceContext, ListResult,
};

pub fn get_patients(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<PatientFilter>,
    sort: Option<PatientSort>,
) -> Result<ListResult<Patient>, RepositoryError> {
    let pagination = get_default_pagination_unlimited(pagination);
    let repository = PatientRepository::new(&ctx.connection);

    let rows = repository.query(pagination, filter.clone(), sort)?;

    Ok(ListResult {
        rows,
        count: i64_to_u32(repository.count(filter)?),
    })
}
