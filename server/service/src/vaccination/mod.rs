use repository::VaccinationRow;

use crate::service_provider::ServiceContext;

pub mod insert;
mod validate;

pub trait VaccinationServiceTrait: Sync + Send {
    fn insert_vaccination(
        &self,
        ctx: &ServiceContext,
        input: insert::InsertVaccination,
    ) -> Result<VaccinationRow, insert::InsertVaccinationError> {
        insert::insert_vaccination(ctx, input)
    }
}

pub struct VaccinationService {}
impl VaccinationServiceTrait for VaccinationService {}
