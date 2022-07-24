use repository::Document;
use repository::Program;
use repository::ProgramFilter;
use repository::RepositoryError;

use crate::service_provider::ServiceContext;
use crate::service_provider::ServiceProvider;

use self::query::get_patient_programs;
pub use self::upsert::*;

pub mod program_schema;
mod program_updated;
mod query;
mod upsert;

pub trait ProgramServiceTrait: Sync + Send {
    fn upsert_program(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        store_id: String,
        user_id: &str,
        input: UpsertProgram,
    ) -> Result<(Program, Document), UpsertProgramError> {
        upsert_program(ctx, service_provider, store_id, user_id, input)
    }

    fn get_patient_programs(
        &self,
        ctx: &ServiceContext,
        filter: Option<ProgramFilter>,
    ) -> Result<Vec<Program>, RepositoryError> {
        get_patient_programs(ctx, filter)
    }
}

pub struct ProgramService {}
impl ProgramServiceTrait for ProgramService {}
