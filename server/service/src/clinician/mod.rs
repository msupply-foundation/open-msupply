use repository::{Clinician, ClinicianFilter, ClinicianSort, PaginationOption};

use crate::{service_provider::ServiceContext, ListError, ListResult};

use self::query::get_clinicians;

mod query;

pub trait ClinicianServiceTrait: Sync + Send {
    fn get_clinicians(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        pagination: Option<PaginationOption>,
        filter: Option<ClinicianFilter>,
        sort: Option<ClinicianSort>,
    ) -> Result<ListResult<Clinician>, ListError> {
        get_clinicians(ctx, store_id, pagination, filter, sort)
    }
}

pub struct ClinicianService;
impl ClinicianServiceTrait for ClinicianService {}
