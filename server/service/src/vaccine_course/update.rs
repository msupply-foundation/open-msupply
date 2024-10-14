use super::{
    query::get_vaccine_course,
    validate::{check_dose_min_ages_are_in_order, check_vaccine_course_name_exists_for_program},
};
use crate::{
    activity_log::activity_log_entry, demographic::validate::check_demographic_exists,
    service_provider::ServiceContext, vaccine_course::validate::check_vaccine_course_exists,
    SingleRecordError,
};

use repository::{
    vaccine_course::{
        vaccine_course_dose::{VaccineCourseDoseFilter, VaccineCourseDoseRepository},
        vaccine_course_dose_row::{VaccineCourseDoseRow, VaccineCourseDoseRowRepository},
        vaccine_course_item::{VaccineCourseItemFilter, VaccineCourseItemRepository},
        vaccine_course_item_row::{VaccineCourseItemRow, VaccineCourseItemRowRepository},
        vaccine_course_row::{VaccineCourseRow, VaccineCourseRowRepository},
    },
    ActivityLogType, EqualFilter, RepositoryError, StorageConnection,
};

#[derive(PartialEq, Debug)]
pub enum UpdateVaccineCourseError {
    VaccineCourseNameExistsForThisProgram,
    VaccineCourseDoesNotExist,
    DoseMinAgesAreNotInOrder,
    CreatedRecordNotFound,
    DemographicDoesNotExist,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct VaccineCourseItemInput {
    pub id: String,
    pub item_id: String,
}

impl VaccineCourseItemInput {
    pub fn to_domain(self, vaccine_course_id: String) -> VaccineCourseItemRow {
        VaccineCourseItemRow {
            id: self.id,
            item_link_id: self.item_id, // Todo item_link_id ? https://github.com/msupply-foundation/open-msupply/issues/4129
            vaccine_course_id,
            deleted_datetime: None,
        }
    }
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct VaccineCourseDoseInput {
    pub id: String,
    pub label: String,
    pub min_age: f64,
    pub max_age: f64,
    pub custom_age_label: Option<String>,
    pub min_interval_days: i32,
}

impl VaccineCourseDoseInput {
    pub fn to_domain(self, vaccine_course_id: String) -> VaccineCourseDoseRow {
        VaccineCourseDoseRow {
            id: self.id,
            label: self.label,
            vaccine_course_id,
            min_age: self.min_age,
            max_age: self.max_age,
            min_interval_days: self.min_interval_days,
            custom_age_label: self.custom_age_label,
            deleted_datetime: None,
        }
    }
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UpdateVaccineCourse {
    pub id: String,
    pub name: Option<String>,
    pub vaccine_items: Vec<VaccineCourseItemInput>,
    pub doses: Vec<VaccineCourseDoseInput>,
    pub demographic_id: Option<String>,
    pub coverage_rate: f64,
    pub is_active: bool,
    pub wastage_rate: f64,
}

pub fn update_vaccine_course(
    ctx: &ServiceContext,
    input: UpdateVaccineCourse,
) -> Result<VaccineCourseRow, UpdateVaccineCourseError> {
    let vaccine_course = ctx
        .connection
        .transaction_sync(|connection| {
            let old_row = validate(&input, connection)?;
            let GenerateResult {
                updated_course,
                doses_to_delete,
                vaccine_items_to_delete,
                vaccine_items_to_add,
            } = generate(connection, old_row, input.clone())?;
            VaccineCourseRowRepository::new(connection).upsert_one(&updated_course)?;

            // Update Items
            // Can't delete and recreate due to foreign key constraints - we'll soft delete the explicitly deleted items, and upsert the rest
            let item_repo = VaccineCourseItemRowRepository::new(connection);
            // Delete any existing items that were not in the new list
            for id in vaccine_items_to_delete {
                item_repo.mark_deleted(&id)?;
            }

            // Insert the new vaccine course items
            for item in vaccine_items_to_add {
                item_repo.upsert_one(&item.to_domain(input.clone().id))?;
            }

            // Update Doses
            // Can't delete and recreate due to foreign key constraints - we'll soft delete the explicitly deleted doses, and upsert the rest
            let dose_repo = VaccineCourseDoseRowRepository::new(connection);

            // Delete any existing doses that were not in the new list
            for id in doses_to_delete {
                dose_repo.mark_deleted(&id)?;
            }

            // Upsert the vaccine course doses
            for dose in input.clone().doses {
                dose_repo.upsert_one(&dose.to_domain(input.clone().id))?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::VaccineCourseUpdated,
                Some(updated_course.id.clone()),
                None,
                None,
            )?;

            get_vaccine_course(&ctx.connection, updated_course.id)
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

    if let Some(demographic_id) = &input.demographic_id {
        if check_demographic_exists(demographic_id, connection)?.is_none() {
            return Err(UpdateVaccineCourseError::DemographicDoesNotExist);
        }
    }

    let name = match &(input.name) {
        Some(name) => name,
        None => &old_row.name,
    };

    if !check_vaccine_course_name_exists_for_program(
        name,
        // Using old row program id. If in future vaccine courses can change to different
        // program, then this will need to change
        &old_row.program_id,
        Some(old_row.id.to_owned()),
        connection,
    )? {
        return Err(UpdateVaccineCourseError::VaccineCourseNameExistsForThisProgram);
    }

    if !check_dose_min_ages_are_in_order(&input.doses) {
        return Err(UpdateVaccineCourseError::DoseMinAgesAreNotInOrder);
    }

    Ok(old_row)
}

struct GenerateResult {
    updated_course: VaccineCourseRow,
    doses_to_delete: Vec<String>,
    vaccine_items_to_delete: Vec<String>,
    vaccine_items_to_add: Vec<VaccineCourseItemInput>,
}

fn generate(
    connection: &StorageConnection,
    old_row: VaccineCourseRow,
    UpdateVaccineCourse {
        id,
        name,
        vaccine_items,
        doses,
        demographic_id,
        coverage_rate,
        is_active,
        wastage_rate,
    }: UpdateVaccineCourse,
) -> Result<GenerateResult, RepositoryError> {
    let updated_course = VaccineCourseRow {
        id: id.clone(),
        name: name.unwrap_or(old_row.name),
        program_id: old_row.program_id,
        demographic_id: demographic_id.or(old_row.demographic_id),
        coverage_rate,
        is_active,
        wastage_rate,
        deleted_datetime: None,
    };

    let doses_in_course = VaccineCourseDoseRepository::new(&connection)
        .query_by_filter(
            VaccineCourseDoseFilter::new().vaccine_course_id(EqualFilter::equal_to(&id)),
        )?
        .iter()
        .map(|dose| dose.vaccine_course_dose_row.id.clone())
        .collect::<Vec<String>>();

    // Should delete any doses that are not in the new list
    let doses_to_delete = doses_in_course
        .into_iter()
        .filter(|dose_id| !doses.iter().any(|new_dose| &new_dose.id == dose_id))
        .collect();

    let items_for_course = VaccineCourseItemRepository::new(&connection).query_by_filter(
        VaccineCourseItemFilter::new().vaccine_course_id(EqualFilter::equal_to(&id)),
    )?;

    // Should remove any items that are not in the new list
    let vaccine_items_to_delete = items_for_course
        .clone()
        .into_iter()
        .filter_map(|item| {
            if !vaccine_items
                .iter()
                .any(|new_item| new_item.id == item.vaccine_course_item.id)
            {
                Some(item.vaccine_course_item.id)
            } else {
                None
            }
        })
        .collect();

    // Should add any items that don't yet exist
    let vaccine_items_to_add = vaccine_items
        .into_iter()
        .filter(|item| {
            !items_for_course
                .iter()
                .any(|existing_item| existing_item.vaccine_course_item.id == item.id)
        })
        .collect();

    Ok(GenerateResult {
        updated_course,
        doses_to_delete,
        vaccine_items_to_delete,
        vaccine_items_to_add,
    })
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
