use repository::Document;
use repository::Pagination;
use repository::Program;
use repository::ProgramFilter;
use repository::ProgramSortField;
use repository::RepositoryError;
use repository::Sort;

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
        user_id: &str,
        input: UpsertProgram,
    ) -> Result<(Program, Document), UpsertProgramError> {
        upsert_program(ctx, service_provider, user_id, input)
    }

    fn get_patient_programs(
        &self,
        ctx: &ServiceContext,
        pagination: Pagination,
        sort: Option<Sort<ProgramSortField>>,
        filter: Option<ProgramFilter>,
    ) -> Result<Vec<Program>, RepositoryError> {
        get_patient_programs(ctx, pagination, sort, filter)
    }
}

pub struct ProgramService {}
impl ProgramServiceTrait for ProgramService {}
