use repository::Document;

use crate::service_provider::ServiceContext;
use crate::service_provider::ServiceProvider;

pub use self::insert::*;
pub use self::update::*;
pub mod encounter_schema;
mod insert;
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
}

pub struct EncounterService {}
impl EncounterServiceTrait for EncounterService {}
