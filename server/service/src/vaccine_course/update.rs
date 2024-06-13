use super::query::get_vaccine_course;
use crate::{
    activity_log::activity_log_entry, demographic::validate::check_demographic_indicator_exists,
    service_provider::ServiceContext, vaccine_course::validate::check_vaccine_course_exists,
    SingleRecordError,
};

use repository::{
    vaccine_course::{
        vaccine_course_item_row::{VaccineCourseItemRow, VaccineCourseItemRowRepository},
        vaccine_course_row::{VaccineCourseRow, VaccineCourseRowRepository},
        vaccine_course_schedule_row::{
            VaccineCourseScheduleRow, VaccineCourseScheduleRowRepository,
        },
    },
    ActivityLogType, RepositoryError, StorageConnection,
};

#[derive(PartialEq, Debug)]
pub enum UpdateVaccineCourseError {
    VaccineCourseDoesNotExist,
    CreatedRecordNotFound,
    DemographicIndicatorDoesNotExist,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct VaccineCourseItem {
    pub id: String,
    pub item_id: String,
}

impl VaccineCourseItem {
    fn to_domain(self, vaccine_course_id: String) -> VaccineCourseItemRow {
        VaccineCourseItemRow {
            id: self.id,
            item_link_id: self.item_id, // Todo item_link_id ? https://github.com/msupply-foundation/open-msupply/issues/4129
            vaccine_course_id,
        }
    }
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct VaccineCourseSchedule {
    pub id: String,
    pub dose_number: i32,
    pub label: String,
}

impl VaccineCourseSchedule {
    fn to_domain(self, vaccine_course_id: String) -> VaccineCourseScheduleRow {
        VaccineCourseScheduleRow {
            id: self.id,
            dose_number: self.dose_number,
            label: self.label,
            vaccine_course_id,
        }
    }
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UpdateVaccineCourse {
    pub id: String,
    pub name: Option<String>,
    pub item_ids: Vec<VaccineCourseItem>,
    pub schedules: Vec<VaccineCourseSchedule>,
    pub demographic_indicator_id: Option<String>,
    pub coverage_rate: f64,
    pub is_active: bool,
    pub wastage_rate: f64,
    pub doses: i32,
}

pub fn update_vaccine_course(
    ctx: &ServiceContext,
    input: UpdateVaccineCourse,
) -> Result<VaccineCourseRow, UpdateVaccineCourseError> {
    let vaccine_course = ctx
        .connection
        .transaction_sync(|connection| {
            let old_row = validate(&input, connection)?;
            let new_vaccine_course = generate(old_row, input.clone());
            VaccineCourseRowRepository::new(connection).upsert_one(&new_vaccine_course)?;

            // Update ITEMS - Delete and recreate all records.
            // If nothing has changed, we still need to query and compare each record so this is the simplest way
            let item_repo = VaccineCourseItemRowRepository::new(connection);
            // Delete the existing vaccine course items
            item_repo.delete_by_vaccine_course_id(&new_vaccine_course.id)?;

            // Insert the new vaccine course items
            for item in input.clone().item_ids {
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
                ActivityLogType::VaccineCourseUpdated,
                Some(new_vaccine_course.id.clone()),
                None,
                None,
            )?;

            get_vaccine_course(&ctx.connection, new_vaccine_course.id)
                .map_err(UpdateVaccineCourseError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(vaccine_course)
}

pub fn validate(
    input: &UpdateVaccineCourse,
    connection: &StorageConnection,
) -> Result<VaccineCourseRow, UpdateVaccineCourseError> {
    let result = check_vaccine_course_exists(&input.id, connection)?;

    let old_row = match result {
        Some(vaccine_course) => vaccine_course,
        None => return Err(UpdateVaccineCourseError::VaccineCourseDoesNotExist),
    };

    if let Some(demographic_indicator_id) = &input.demographic_indicator_id {
        if check_demographic_indicator_exists(demographic_indicator_id, connection)?.is_none() {
            return Err(UpdateVaccineCourseError::DemographicIndicatorDoesNotExist);
        }
    }
    Ok(old_row)
}

pub fn generate(
    old_row: VaccineCourseRow,
    UpdateVaccineCourse {
        id,
        name,
        item_ids: _,  // Updated in main function
        schedules: _, // Updated in main function
        demographic_indicator_id,
        coverage_rate,
        is_active,
        wastage_rate,
        doses,
    }: UpdateVaccineCourse,
) -> VaccineCourseRow {
    VaccineCourseRow {
        id,
        name: name.unwrap_or(old_row.name),
        program_id: old_row.program_id,
        demographic_indicator_id: demographic_indicator_id.or(old_row.demographic_indicator_id),
        coverage_rate,
        is_active,
        wastage_rate,
        doses,
    }
}

impl From<RepositoryError> for UpdateVaccineCourseError {
    fn from(error: RepositoryError) -> Self {
        UpdateVaccineCourseError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for UpdateVaccineCourseError {
    fn from(error: SingleRecordError) -> Self {
        use UpdateVaccineCourseError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
