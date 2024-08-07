use repository::{
    vaccine_course::{
        vaccine_course::{VaccineCourseFilter, VaccineCourseRepository},
        vaccine_course_row::{VaccineCourseRow, VaccineCourseRowRepository},
    },
    EqualFilter, ProgramRow, ProgramRowRepository, RepositoryError, StorageConnection,
    StringFilter,
};

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
