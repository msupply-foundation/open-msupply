use repository::{PaginationOption, RepositoryError};

use crate::service_provider::ServiceContext;

pub use self::query::*;
mod query;

pub trait PatientServiceTrait: Sync + Send {
    fn get_patients(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        pagination: Option<PaginationOption>,
        filter: Option<PatientFilter>,
        sort: Option<PatientSort>,
    ) -> Result<Vec<Patient>, RepositoryError> {
        get_patients(ctx, store_id, pagination, filter, sort)
    }
}

pub struct PatientService {}
impl PatientServiceTrait for PatientService {}
