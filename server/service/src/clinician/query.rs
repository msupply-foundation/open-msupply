use repository::{
    Clinician, ClinicianFilter, ClinicianRepository, ClinicianSort, PaginationOption,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_clinicians(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<ClinicianFilter>,
    sort: Option<ClinicianSort>,
) -> Result<ListResult<Clinician>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = ClinicianRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(store_id, pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(store_id, filter)?),
    })
}
