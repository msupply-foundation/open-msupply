use repository::Document;

use crate::service_provider::ServiceContext;
use crate::service_provider::ServiceProvider;

pub use self::upsert::*;
mod program_schema;
mod upsert;
pub trait ProgramServiceTrait: Sync + Send {
    fn upsert_program(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        store_id: String,
        user_id: &str,
        input: UpsertProgram,
    ) -> Result<Document, UpsertProgramError> {
        upsert_program(ctx, service_provider, store_id, user_id, input)
    }
}

pub struct ProgramService {}
impl ProgramServiceTrait for ProgramService {}
