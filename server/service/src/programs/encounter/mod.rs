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
pub use self::update::*;

pub mod encounter_fields;
pub mod encounter_schema;
pub mod encounter_updated;
pub(crate) mod extract_fields;
mod insert;
mod query;
mod update;
pub(crate) mod validate_misc;

pub trait EncounterServiceTrait: Sync + Send {
    fn insert_encounter(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        user_id: &str,
        input: InsertEncounter,
        allowed_docs: Vec<String>,
    ) -> Result<Document, InsertEncounterError> {
        insert_encounter(ctx, service_provider, user_id, input, allowed_docs)
    }

    fn update_encounter(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        user_id: &str,
        input: UpdateEncounter,
        allowed_docs: Vec<String>,
    ) -> Result<Document, UpdateEncounterError> {
        update_encounter(ctx, service_provider, user_id, input, allowed_docs)
    }

    fn encounter(
        &self,
        ctx: &ServiceContext,
        filter: EncounterFilter,
        allowed_docs: Vec<String>,
    ) -> Result<Option<Encounter>, RepositoryError> {
        encounter(ctx, filter, allowed_docs)
    }

    fn encounters(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<EncounterFilter>,
        sort: Option<EncounterSort>,
        allowed_docs: Vec<String>,
    ) -> Result<ListResult<Encounter>, ListError> {
        encounters(ctx, pagination, filter, sort, allowed_docs)
    }

    fn encounters_fields(
        &self,
        ctx: &ServiceContext,
        input: EncounterFields,
        pagination: Option<PaginationOption>,
        filter: Option<EncounterFilter>,
        sort: Option<EncounterSort>,
        allowed_docs: Vec<String>,
    ) -> Result<ListResult<EncounterFieldsResult>, ListError> {
        encounter_fields(ctx, input, pagination, filter, sort, allowed_docs)
    }
}

pub struct EncounterService {}
impl EncounterServiceTrait for EncounterService {}
