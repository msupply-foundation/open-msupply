use get_vaccination_card::VaccinationCard;
use repository::{RepositoryError, Vaccination};

use crate::service_provider::ServiceContext;

pub mod get_vaccination_card;
pub mod insert;
pub mod query;
pub mod update;
mod validate;

pub trait VaccinationServiceTrait: Sync + Send {
    fn get_vaccination(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<Vaccination, RepositoryError> {
        query::get_vaccination(ctx, id)
    }

    fn get_vaccination_card(
        &self,
        ctx: &ServiceContext,
        program_enrolment_id: String,
    ) -> Result<VaccinationCard, RepositoryError> {
        get_vaccination_card::get_vaccination_card(ctx, program_enrolment_id)
    }

    fn insert_vaccination(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: insert::InsertVaccination,
    ) -> Result<Vaccination, insert::InsertVaccinationError> {
        insert::insert_vaccination(ctx, store_id, input)
    }

    fn update_vaccination(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: update::UpdateVaccination,
    ) -> Result<Vaccination, update::UpdateVaccinationError> {
        update::update_vaccination(ctx, store_id, input)
    }
}

pub struct VaccinationService {}
impl VaccinationServiceTrait for VaccinationService {}
