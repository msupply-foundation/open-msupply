use repository::Document;
use repository::Encounter;
use repository::EncounterFilter;
use repository::RepositoryError;

use crate::service_provider::ServiceContext;
use crate::service_provider::ServiceProvider;

pub use self::insert::*;
use self::query::get_patient_program_encounters;
pub use self::update::*;

pub mod encounter_schema;
mod encounter_updated;
mod insert;
mod query;
mod update;

pub trait EncounterServiceTrait: Sync + Send {
    fn insert_encounter(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        store_id: String,
        user_id: &str,
        input: InsertEncounter,
    ) -> Result<Document, InsertEncounterError> {
        insert_encounter(ctx, service_provider, store_id, user_id, input)
    }

    fn update_encounter(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        store_id: String,
        user_id: &str,
        input: UpdateEncounter,
    ) -> Result<Document, UpdateEncounterError> {
        update_encounter(ctx, service_provider, store_id, user_id, input)
    }

    fn get_patient_program_encounters(
        &self,
        ctx: &ServiceContext,
        filter: Option<EncounterFilter>,
    ) -> Result<Vec<Encounter>, RepositoryError> {
        get_patient_program_encounters(ctx, filter)
    }
}

pub struct EncounterService {}
impl EncounterServiceTrait for EncounterService {}
