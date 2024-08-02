use crate::{
    program::validate::check_immunisation_program_exists, service_provider::ServiceContext,
};

use repository::{
    vaccine_course::{
        vaccine_course::{VaccineCourseFilter, VaccineCourseRepository},
        vaccine_course_row::VaccineCourseRowRepository,
    },
    EqualFilter, ProgramRowRepository, RepositoryError, StorageConnection, TransactionError,
};

#[derive(PartialEq, Debug)]
pub enum DeleteImmunisationProgramError {
    ImmunisationProgramDoesNotExist,
    DatabaseError(RepositoryError),
}

pub fn delete_immunisation_program(
    ctx: &ServiceContext,
    id: String,
) -> Result<String, DeleteImmunisationProgramError> {
    let immunisation_program_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &id)?;
            let courses_to_delete = generate(connection, &id)?;

            let program_row_repo = ProgramRowRepository::new(connection);
            let vaccine_course_row_repo = VaccineCourseRowRepository::new(connection);

            program_row_repo
                .mark_deleted(&id)
                .map_err(DeleteImmunisationProgramError::from)?;

            for id in courses_to_delete.iter() {
                vaccine_course_row_repo
                    .mark_deleted(id)
                    .map_err(DeleteImmunisationProgramError::from)?;
            }

            Ok(id)
        })
        .map_err(|error: TransactionError<DeleteImmunisationProgramError>| {
            error.to_inner_error()
        })?;
    Ok(immunisation_program_id)
}

impl From<RepositoryError> for DeleteImmunisationProgramError {
    fn from(error: RepositoryError) -> Self {
        DeleteImmunisationProgramError::DatabaseError(error)
    }
}

fn validate(
    connection: &StorageConnection,
    id: &str,
) -> Result<(), DeleteImmunisationProgramError> {
    check_immunisation_program_exists(id, connection)?
        .ok_or(DeleteImmunisationProgramError::ImmunisationProgramDoesNotExist)?;

    Ok(())
}

fn generate(
    connection: &StorageConnection,
    id: &str,
) -> Result<Vec<String>, DeleteImmunisationProgramError> {
    let vaccine_courses = VaccineCourseRepository::new(connection)
        .query_by_filter(VaccineCourseFilter::new().program_id(EqualFilter::equal_to(id)))?;

    let vaccine_course_ids_to_delete = vaccine_courses.into_iter().map(|v| v.id).collect();

    Ok(vaccine_course_ids_to_delete)
}
