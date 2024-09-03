use super::{
    query::get_vaccine_course,
    update::{VaccineCourseDoseInput, VaccineCourseItemInput},
    validate::{
        check_dose_min_ages_are_in_order, check_program_exists,
        check_vaccine_course_name_exists_for_program,
    },
};
use crate::{
    activity_log::activity_log_entry, service_provider::ServiceContext,
    vaccine_course::validate::check_vaccine_course_exists, SingleRecordError,
};

use repository::{
    vaccine_course::{
        vaccine_course_dose_row::VaccineCourseDoseRowRepository,
        vaccine_course_item_row::VaccineCourseItemRowRepository,
        vaccine_course_row::{VaccineCourseRow, VaccineCourseRowRepository},
    },
    ActivityLogType, RepositoryError, StorageConnection,
};

#[derive(PartialEq, Debug)]
pub enum InsertVaccineCourseError {
    VaccineCourseNameExistsForThisProgram,
    VaccineCourseAlreadyExists,
    CreatedRecordNotFound,
    ProgramDoesNotExist,
    DoseMinAgesAreNotInOrder,
    DemographicIndicatorDoesNotExist,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertVaccineCourse {
    pub id: String,
    pub name: String,
    pub program_id: String,
    pub vaccine_items: Vec<VaccineCourseItemInput>,
    pub doses: Vec<VaccineCourseDoseInput>,
    pub demographic_indicator_id: Option<String>,
    pub coverage_rate: f64,
    pub is_active: bool,
    pub wastage_rate: f64,
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

            // Update doses - Delete and recreate all records.
            let dose_repo = VaccineCourseDoseRowRepository::new(connection);
            // Delete the existing vaccine course doses
            dose_repo.delete_by_vaccine_course_id(&new_vaccine_course.id)?;

            // Insert the new vaccine course doses
            for dose in input.clone().doses {
                dose_repo.upsert_one(&dose.to_domain(input.clone().id))?;
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

    if !check_dose_min_ages_are_in_order(&input.doses) {
        return Err(InsertVaccineCourseError::DoseMinAgesAreNotInOrder);
    }

    Ok(())
}

pub fn generate(
    InsertVaccineCourse {
        id,
        name,
        program_id,
        vaccine_items: _, // Updated in main function
        doses: _,         // Updated in main function
        demographic_indicator_id,
        coverage_rate,
        is_active,
        wastage_rate,
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
