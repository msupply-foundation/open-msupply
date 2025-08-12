use repository::{
    vaccine_course::{
        vaccine_course::{VaccineCourseFilter, VaccineCourseRepository, VaccineCourseSort},
        vaccine_course_dose::{VaccineCourseDoseFilter, VaccineCourseDoseRepository},
        vaccine_course_dose_row::VaccineCourseDoseRow,
        vaccine_course_row::VaccineCourseRow,
    },
    EqualFilter, PaginationOption, StorageConnection,
};

use crate::{get_pagination_or_default, i64_to_u32, ListError, ListResult, SingleRecordError};
 

pub fn get_vaccine_courses(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<VaccineCourseFilter>,
    sort: Option<VaccineCourseSort>,
) -> Result<ListResult<VaccineCourseRow>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = VaccineCourseRepository::new(connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_vaccine_course(
    connection: &StorageConnection,
    id: String,
) -> Result<VaccineCourseRow, SingleRecordError> {
    let repository = VaccineCourseRepository::new(connection);

    let mut result =
        repository.query_by_filter(VaccineCourseFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
pub fn get_vaccine_course_dose(
    connection: &StorageConnection,
    id: String,
) -> Result<VaccineCourseDoseRow, SingleRecordError> {
    let repository = VaccineCourseDoseRepository::new(connection);

    let result = repository.query_one(
        VaccineCourseDoseFilter::new()
            .id(EqualFilter::equal_to(&id))
            // We're getting by id, so we want to include deleted records
            // Currently this is only used from vaccination modal - if there are other cases we may need to reconsider
            .include_deleted(true),
    )?;

    match result {
        Some(record) => Ok(record.vaccine_course_dose_row),
        None => Err(SingleRecordError::NotFound(id)),
    }
}
