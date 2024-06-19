use repository::{
    vaccine_course::vaccine_course_row::VaccineCourseRowRepository, RepositoryError,
    StorageConnection,
};

use crate::service_provider::ServiceContext;

use super::validate::check_vaccine_course_exists;

#[derive(PartialEq, Debug)]
pub enum DeleteVaccineCourseError {
    VaccineCourseDoesNotExist,
    DatabaseError(RepositoryError),
}

pub fn delete_vaccine_course(
    ctx: &ServiceContext,
    id: String,
) -> Result<String, DeleteVaccineCourseError> {
    let vaccine_course_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &id)?;

            let repo = VaccineCourseRowRepository::new(connection);

            repo.mark_deleted(&id)
                .map(|_| id)
                .map_err(DeleteVaccineCourseError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(vaccine_course_id)
}

impl From<RepositoryError> for DeleteVaccineCourseError {
    fn from(error: RepositoryError) -> Self {
        DeleteVaccineCourseError::DatabaseError(error)
    }
}

fn validate(connection: &StorageConnection, id: &str) -> Result<(), DeleteVaccineCourseError> {
    check_vaccine_course_exists(id, connection)?
        .ok_or(DeleteVaccineCourseError::VaccineCourseDoesNotExist)?;

    Ok(())
}
