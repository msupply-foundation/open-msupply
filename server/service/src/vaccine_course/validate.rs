use repository::{
    vaccine_course::{
        vaccine_course::{VaccineCourseFilter, VaccineCourseRepository},
        vaccine_course_row::{VaccineCourseRow, VaccineCourseRowRepository},
    },
    EqualFilter, ProgramRow, ProgramRowRepository, RepositoryError, StorageConnection,
    StringFilter,
};

use super::update::VaccineCourseDoseInput;

pub fn check_vaccine_course_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<VaccineCourseRow>, RepositoryError> {
    VaccineCourseRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_program_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<ProgramRow>, RepositoryError> {
    ProgramRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_vaccine_course_name_exists_for_program(
    name: &str,
    program_id: &str,
    id: Option<String>,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let mut filter = VaccineCourseFilter::new()
        .program_id(EqualFilter::equal_to(program_id))
        .name(StringFilter::equal_to(name));

    if let Some(id) = id {
        filter = filter.id(EqualFilter::not_equal_to(&id));
    }
    let result = VaccineCourseRepository::new(connection).query_by_filter(filter)?;
    Ok(result.is_empty())
}

pub fn check_dose_min_ages_are_in_order(doses: &Vec<VaccineCourseDoseInput>) -> bool {
    // First dose could be at 0.0 months, so we start with -0.01
    let mut prev_min_age = -0.01;
    for dose in doses {
        if dose.min_age <= prev_min_age {
            return false;
        }
        prev_min_age = dose.min_age;
    }
    true
}
