use repository::{
    Clinician, ClinicianFilter, ClinicianRepository, ClinicianSort, PaginationOption,
};

use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
 

pub fn get_clinicians(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<ClinicianFilter>,
    sort: Option<ClinicianSort>,
) -> Result<ListResult<Clinician>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = ClinicianRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(store_id, pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(store_id, filter)?),
    })
}
