use super::{
    query::get_vaccine_course,
    validate::{check_program_exists, check_vaccine_course_name_exists_for_program},
};
use crate::{
    activity_log::activity_log_entry, service_provider::ServiceContext,
    vaccine_course::validate::check_vaccine_course_exists, SingleRecordError,
};

use repository::{
    vaccine_course::vaccine_course_row::{VaccineCourseRow, VaccineCourseRowRepository},
    ActivityLogType, RepositoryError, StorageConnection,
};

#[derive(PartialEq, Debug)]
pub enum InsertVaccineCourseError {
    VaccineCourseNameExistsForThisProgram,
    VaccineCourseAlreadyExists,
    CreatedRecordNotFound,
    ProgramDoesNotExist,
    DemographicIndicatorDoesNotExist,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertVaccineCourse {
    pub id: String,
    pub name: String,
    pub program_id: String,
}

pub fn insert_vaccine_course(
    ctx: &ServiceContext,
    input: InsertVaccineCourse,
) -> Result<VaccineCourseRow, InsertVaccineCourseError> {
    let vaccine_course = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_vaccine_course = generate(input);
            VaccineCourseRowRepository::new(connection).upsert_one(&new_vaccine_course)?;

            activity_log_entry(
                ctx,
                ActivityLogType::VaccineCourseCreated,
                Some(new_vaccine_course.id.clone()),
                None,
                None,
            )?;

            get_vaccine_course(&ctx.connection, new_vaccine_course.id)
                .map_err(InsertVaccineCourseError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(vaccine_course)
}

pub fn validate(
    input: &InsertVaccineCourse,
    connection: &StorageConnection,
) -> Result<(), InsertVaccineCourseError> {
    if check_vaccine_course_exists(&input.id, connection)?.is_some() {
        return Err(InsertVaccineCourseError::VaccineCourseAlreadyExists);
    }

    if check_program_exists(&input.program_id, connection)?.is_none() {
        return Err(InsertVaccineCourseError::ProgramDoesNotExist);
    }

    if !check_vaccine_course_name_exists_for_program(
        &input.name,
        &input.program_id,
        None,
        connection,
    )? {
        return Err(InsertVaccineCourseError::VaccineCourseNameExistsForThisProgram);
    }

    Ok(())
}

pub fn generate(
    InsertVaccineCourse {
        id,
        name,
        program_id,
    }: InsertVaccineCourse,
) -> VaccineCourseRow {
    VaccineCourseRow {
        id,
        name,
        program_id,
        demographic_indicator_id: None,
        coverage_rate: 100.0,
        is_active: true,
        wastage_rate: 0.0,
        doses: 1,
        deleted_datetime: None,
    }
}

impl From<RepositoryError> for InsertVaccineCourseError {
    fn from(error: RepositoryError) -> Self {
        InsertVaccineCourseError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertVaccineCourseError {
    fn from(error: SingleRecordError) -> Self {
        use InsertVaccineCourseError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
