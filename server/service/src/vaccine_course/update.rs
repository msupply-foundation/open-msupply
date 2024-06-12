use super::query::get_vaccine_course;
use crate::{
    activity_log::activity_log_entry, service_provider::ServiceContext,
    vaccine_course::validate::check_vaccine_course_exists, SingleRecordError,
};

use repository::{
    vaccine_course::{
        vaccine_course_item::{VaccineCourseItemFilter, VaccineCourseItemRepository},
        vaccine_course_item_row::{VaccineCourseItemRow, VaccineCourseItemRowRepository},
        vaccine_course_row::{VaccineCourseRow, VaccineCourseRowRepository},
        vaccine_course_schedule::{VaccineCourseScheduleFilter, VaccineCourseScheduleRepository},
        vaccine_course_schedule_row::{
            VaccineCourseScheduleRow, VaccineCourseScheduleRowRepository,
        },
    },
    ActivityLogType, EqualFilter, RepositoryError, StorageConnection,
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

#[derive(PartialEq, Debug, Clone, Default)]
pub struct VaccineCourseSchedule {
    pub id: String,
    pub dose_number: i32,
    pub label: String,
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

            // Update the item list
            let current_items = VaccineCourseItemRepository::new(connection).query_by_filter(
                VaccineCourseItemFilter::new()
                    .vaccine_course_id(EqualFilter::equal_to(&new_vaccine_course.id)),
            )?;
            // Add any new items, and remove any items that are not in the input
            let items_to_add = input
                .clone()
                .item_ids
                .iter()
                .filter(|new_item| !current_items.iter().any(|i| i.id == new_item.id))
                .map(|new_item| VaccineCourseItemRow {
                    id: new_item.id.clone(),
                    vaccine_course_id: new_vaccine_course.id.clone(),
                    item_link_id: new_item.item_id.clone(), // TODO: Handle item_link_id properly https://github.com/msupply-foundation/open-msupply/issues/4129
                })
                .collect::<Vec<_>>();
            let items_to_remove = current_items.iter().filter(|current_item| {
                !input
                    .clone()
                    .item_ids
                    .iter()
                    .any(|new_item| new_item.id == current_item.id)
            });

            for item in items_to_add {
                VaccineCourseItemRowRepository::new(connection).upsert_one(&item)?;
            }
            for item in items_to_remove {
                VaccineCourseItemRowRepository::new(connection).delete(&item.id)?;
            }

            // Check the current schedules
            let current_schedules = VaccineCourseScheduleRepository::new(connection)
                .query_by_filter(
                    VaccineCourseScheduleFilter::new()
                        .vaccine_course_id(EqualFilter::equal_to(&new_vaccine_course.id)),
                )?;
            // Add any new schedules, and remove any schedules that are not in the input
            let schedules_to_add = input
                .clone()
                .schedules
                .iter()
                .filter(|new_schedule| !current_schedules.iter().any(|s| s.id == new_schedule.id))
                .map(|new_schedule| VaccineCourseScheduleRow {
                    id: new_schedule.id.clone(),
                    vaccine_course_id: new_vaccine_course.id.clone(),
                    label: new_schedule.label.clone(),
                    dose_number: new_schedule.dose_number,
                })
                .collect::<Vec<_>>();

            let schedules_to_remove = current_schedules.iter().filter(|current_schedule| {
                !input
                    .clone()
                    .schedules
                    .iter()
                    .any(|new_schedule| new_schedule.id == current_schedule.id)
            });

            for schedule in schedules_to_add {
                VaccineCourseScheduleRowRepository::new(connection).upsert_one(&schedule)?;
            }
            for schedule in schedules_to_remove {
                VaccineCourseScheduleRowRepository::new(connection).delete(&schedule.id)?;
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

    // TODO: demographic_indicator_id
    // if let Some(demographic_indicator_id) = &input.demographic_indicator_id {
    //     if check_demographic_indicator_exists(demographic_indicator_id, connection)?.is_none() {
    //         return Err(UpdateVaccineCourseError::DemographicIndicatorDoesNotExist);
    //     }
    // }
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
