use repository::{RepositoryError, Vaccination};

use crate::service_provider::ServiceContext;

pub mod insert;
pub mod query;
mod validate;

pub trait VaccinationServiceTrait: Sync + Send {
    fn get_vaccination(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<Vaccination, RepositoryError> {
        query::get_vaccination(ctx, id)
    }

    fn insert_vaccination(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: insert::InsertVaccination,
    ) -> Result<Vaccination, insert::InsertVaccinationError> {
        insert::insert_vaccination(ctx, store_id, input)
    }
}

pub struct VaccinationService {}
impl VaccinationServiceTrait for VaccinationService {}
