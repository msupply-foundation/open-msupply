use repository::Document;
use repository::Pagination;
use repository::ProgramEnrolment;
use repository::ProgramEnrolmentFilter;
use repository::ProgramEnrolmentSortField;
use repository::RepositoryError;
use repository::Sort;

use crate::service_provider::ServiceContext;
use crate::service_provider::ServiceProvider;

use self::query::get_patient_program_enrolments;
pub use self::upsert::*;

pub mod program_schema;
mod program_updated;
mod query;
mod upsert;

pub trait ProgramEnrolmentServiceTrait: Sync + Send {
    fn upsert_program_enrolment(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        user_id: &str,
        input: UpsertProgramEnrolment,
    ) -> Result<Document, UpsertProgramEnrolmentError> {
        upsert_program_enrolment(ctx, service_provider, user_id, input)
    }

    fn get_patient_program_enrolments(
        &self,
        ctx: &ServiceContext,
        pagination: Pagination,
        sort: Option<Sort<ProgramEnrolmentSortField>>,
        filter: Option<ProgramEnrolmentFilter>,
    ) -> Result<Vec<ProgramEnrolment>, RepositoryError> {
        get_patient_program_enrolments(ctx, pagination, sort, filter)
    }
}

pub struct ProgramEnrolmentService {}
impl ProgramEnrolmentServiceTrait for ProgramEnrolmentService {}
