use repository::{
    vaccine_course::vaccine_course_row::{VaccineCourseRow, VaccineCourseRowRepository},
    RepositoryError, StorageConnection,
};

pub fn check_vaccine_course_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<VaccineCourseRow>, RepositoryError> {
    VaccineCourseRowRepository::new(connection).find_one_by_id(id)
}
