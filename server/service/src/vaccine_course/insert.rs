use super::{
    query::get_vaccine_course,
    update::{VaccineCourseItemInput, VaccineCourseScheduleInput},
    validate::{check_program_exists, check_vaccine_course_name_exists_for_program},
};
use crate::{
    activity_log::activity_log_entry, service_provider::ServiceContext,
    vaccine_course::validate::check_vaccine_course_exists, SingleRecordError,
};

use repository::{
    vaccine_course::{
        vaccine_course_item_row::VaccineCourseItemRowRepository,
        vaccine_course_row::{VaccineCourseRow, VaccineCourseRowRepository},
        vaccine_course_schedule_row::VaccineCourseScheduleRowRepository,
    },
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
    pub vaccine_items: Vec<VaccineCourseItemInput>,
    pub schedules: Vec<VaccineCourseScheduleInput>,
    pub demographic_indicator_id: Option<String>,
    pub coverage_rate: f64,
    pub is_active: bool,
    pub wastage_rate: f64,
    pub doses: i32,
}

pub fn insert_vaccine_course(
    ctx: &ServiceContext,
    input: InsertVaccineCourse,
) -> Result<VaccineCourseRow, InsertVaccineCourseError> {
    let vaccine_course = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_vaccine_course = generate(input.clone());
            VaccineCourseRowRepository::new(connection).upsert_one(&new_vaccine_course)?;

            // Update ITEMS - Delete and recreate all records.
            // If nothing has changed, we still need to query and compare each record so this is the simplest way
            let item_repo = VaccineCourseItemRowRepository::new(connection);
            // Delete the existing vaccine course items
            item_repo.delete_by_vaccine_course_id(&new_vaccine_course.id)?;

            // Insert the new vaccine course items
            for item in input.clone().vaccine_items {
                item_repo.upsert_one(&item.to_domain(input.clone().id))?;
            }

            // Update Schedules - Delete and recreate all records.
            let schedule_repo = VaccineCourseScheduleRowRepository::new(connection);
            // Delete the existing vaccine course schedules
            schedule_repo.delete_by_vaccine_course_id(&new_vaccine_course.id)?;

            // Insert the new vaccine course schedules
            for schedule in input.clone().schedules {
                schedule_repo.upsert_one(&schedule.to_domain(input.clone().id))?;
            }

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
        vaccine_items: _, // Updated in main function
        schedules: _,     // Updated in main function
        demographic_indicator_id,
        coverage_rate,
        is_active,
        wastage_rate,
        doses,
    }: InsertVaccineCourse,
) -> VaccineCourseRow {
    VaccineCourseRow {
        id,
        name,
        program_id,
        demographic_indicator_id,
        coverage_rate,
        is_active,
        wastage_rate,
        doses,
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
