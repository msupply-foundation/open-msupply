use repository::Document;
use repository::Pagination;
use repository::ProgramEnrolment;
use repository::ProgramEnrolmentFilter;
use repository::ProgramEnrolmentSortField;
use repository::RepositoryError;
use repository::Sort;

use crate::service_provider::ServiceContext;
use crate::service_provider::ServiceProvider;

use self::query::program_enrolment;
use self::query::program_enrolments;
pub use self::upsert::*;

mod program_enrolment_updated;
pub mod program_schema;
mod query;
mod upsert;

pub trait ProgramEnrolmentServiceTrait: Sync + Send {
    fn upsert_program_enrolment(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        user_id: &str,
        input: UpsertProgramEnrolment,
        allowed_docs: Vec<String>,
    ) -> Result<Document, UpsertProgramEnrolmentError> {
        upsert_program_enrolment(ctx, service_provider, user_id, input, allowed_docs)
    }

    fn program_enrolment(
        &self,
        ctx: &ServiceContext,
        filter: ProgramEnrolmentFilter,
        allowed_docs: Vec<String>,
    ) -> Result<Option<ProgramEnrolment>, RepositoryError> {
        program_enrolment(ctx, filter, allowed_docs)
    }

    fn program_enrolments(
        &self,
        ctx: &ServiceContext,
        pagination: Pagination,
        sort: Option<Sort<ProgramEnrolmentSortField>>,
        filter: Option<ProgramEnrolmentFilter>,
        allowed_docs: Vec<String>,
    ) -> Result<Vec<ProgramEnrolment>, RepositoryError> {
        program_enrolments(ctx, pagination, sort, filter, allowed_docs)
    }
}

pub struct ProgramEnrolmentService {}
impl ProgramEnrolmentServiceTrait for ProgramEnrolmentService {}
