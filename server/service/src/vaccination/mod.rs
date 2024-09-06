use repository::VaccinationRow;

use crate::service_provider::ServiceContext;

pub mod insert;
mod validate;

pub trait VaccinationServiceTrait: Sync + Send {
    fn insert_vaccination(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: insert::InsertVaccination,
    ) -> Result<VaccinationRow, insert::InsertVaccinationError> {
        insert::insert_vaccination(ctx, store_id, input)
    }
}

pub struct VaccinationService {}
impl VaccinationServiceTrait for VaccinationService {}
