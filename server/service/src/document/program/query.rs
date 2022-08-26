use repository::{
    Pagination, ProgramEnrolment, ProgramEnrolmentFilter, ProgramEnrolmentRepository,
    ProgramEnrolmentSortField, RepositoryError, Sort,
};

use crate::service_provider::ServiceContext;

pub(crate) fn get_patient_program_enrolments(
    ctx: &ServiceContext,
    pagination: Pagination,
    sort: Option<Sort<ProgramEnrolmentSortField>>,
    filter: Option<ProgramEnrolmentFilter>,
) -> Result<Vec<ProgramEnrolment>, RepositoryError> {
    ProgramEnrolmentRepository::new(&ctx.connection).query(pagination, filter, sort)
}
