use repository::Document;
use repository::Encounter;
use repository::EncounterFilter;
use repository::EncounterSort;
use repository::PaginationOption;

use crate::service_provider::ServiceContext;
use crate::service_provider::ServiceProvider;
use crate::ListError;
use crate::ListResult;

use self::extract_encounter_fields::encounter_extract_fields;
use self::extract_encounter_fields::ExtractFieldInput;
use self::extract_encounter_fields::ExtractFieldResult;
pub use self::insert::*;
use self::query::get_patient_program_encounters;
pub use self::update::*;

pub mod encounter_schema;
mod encounter_updated;
pub mod extract_encounter_fields;
pub(crate) mod extract_fields;
mod insert;
mod query;
mod update;

pub trait EncounterServiceTrait: Sync + Send {
    fn insert_encounter(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        user_id: &str,
        input: InsertEncounter,
    ) -> Result<Document, InsertEncounterError> {
        insert_encounter(ctx, service_provider, user_id, input)
    }

    fn update_encounter(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        user_id: &str,
        input: UpdateEncounter,
    ) -> Result<Document, UpdateEncounterError> {
        update_encounter(ctx, service_provider, user_id, input)
    }

    fn get_patient_program_encounters(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<EncounterFilter>,
        sort: Option<EncounterSort>,
    ) -> Result<ListResult<Encounter>, ListError> {
        get_patient_program_encounters(ctx, pagination, filter, sort)
    }

    fn extract_encounters_fields(
        &self,
        ctx: &ServiceContext,
        input: ExtractFieldInput,
        pagination: Option<PaginationOption>,
        filter: Option<EncounterFilter>,
        sort: Option<EncounterSort>,
    ) -> Result<ListResult<ExtractFieldResult>, ListError> {
        encounter_extract_fields(ctx, input, pagination, filter, sort)
    }
}

pub struct EncounterService {}
impl EncounterServiceTrait for EncounterService {}
