use repository::{
    immunisation::{
        vaccine_course::{VaccineCourseFilter, VaccineCourseRepository, VaccineCourseSort},
        vaccine_course_row::VaccineCourseRow,
    },
    EqualFilter, PaginationOption, StorageConnection,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_vaccine_courses(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<VaccineCourseFilter>,
    sort: Option<VaccineCourseSort>,
) -> Result<ListResult<VaccineCourseRow>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = VaccineCourseRepository::new(connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_vaccine_course(
    ctx: &ServiceContext,
    id: String,
) -> Result<VaccineCourseRow, SingleRecordError> {
    let repository = VaccineCourseRepository::new(&ctx.connection);

    let mut result =
        repository.query_by_filter(VaccineCourseFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
