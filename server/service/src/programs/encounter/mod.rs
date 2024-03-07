use repository::Document;
use repository::Encounter;
use repository::EncounterFilter;
use repository::EncounterSort;
use repository::PaginationOption;
use repository::RepositoryError;

use crate::service_provider::ServiceContext;
use crate::service_provider::ServiceProvider;
use crate::ListError;
use crate::ListResult;

use self::encounter_fields::encounter_fields;
use self::encounter_fields::EncounterFields;
use self::encounter_fields::EncounterFieldsResult;
pub use self::insert::*;
use self::query::encounter;
use self::query::encounters;
use self::suggested_next_encounter::{suggested_next_encounter, SuggestedNextEncounter};
pub use self::update::*;

pub mod encounter_fields;
pub mod encounter_schema;
pub mod encounter_updated;
pub(crate) mod extract_fields;
mod insert;
mod query;
pub mod suggested_next_encounter;
mod update;
pub(crate) mod validate_misc;

pub trait EncounterServiceTrait: Sync + Send {
    fn insert_encounter(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        user_id: &str,
        input: InsertEncounter,
        allowed_ctx: Vec<String>,
    ) -> Result<Document, InsertEncounterError> {
        insert_encounter(ctx, service_provider, user_id, input, allowed_ctx)
    }

    fn update_encounter(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        user_id: &str,
        input: UpdateEncounter,
        allowed_ctx: Vec<String>,
    ) -> Result<Document, UpdateEncounterError> {
        update_encounter(ctx, service_provider, user_id, input, allowed_ctx)
    }

    fn encounter(
        &self,
        ctx: &ServiceContext,
        filter: EncounterFilter,
        allowed_ctx: Vec<String>,
    ) -> Result<Option<Encounter>, RepositoryError> {
        encounter(ctx, filter, allowed_ctx)
    }

    fn encounters(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<EncounterFilter>,
        sort: Option<EncounterSort>,
        allowed_ctx: Vec<String>,
    ) -> Result<ListResult<Encounter>, ListError> {
        encounters(ctx, pagination, filter, sort, allowed_ctx)
    }

    fn encounters_fields(
        &self,
        ctx: &ServiceContext,
        input: EncounterFields,
        pagination: Option<PaginationOption>,
        filter: Option<EncounterFilter>,
        sort: Option<EncounterSort>,
        allowed_ctx: Vec<String>,
    ) -> Result<ListResult<EncounterFieldsResult>, ListError> {
        encounter_fields(ctx, input, pagination, filter, sort, allowed_ctx)
    }

    fn suggested_next_encounter(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        patient_id: &str,
        encounter_type: &str,
        allowed_ctx: &[String],
    ) -> Result<Option<SuggestedNextEncounter>, RepositoryError> {
        suggested_next_encounter(
            ctx,
            service_provider,
            patient_id,
            encounter_type,
            allowed_ctx,
        )
    }
}

pub struct EncounterService {}
impl EncounterServiceTrait for EncounterService {}
