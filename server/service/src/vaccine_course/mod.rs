use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};

use repository::{
    vaccine_course::{
        vaccine_course::{VaccineCourseFilter, VaccineCourseSort},
        vaccine_course_row::VaccineCourseRow,
    },
    PaginationOption, StorageConnection,
};

pub mod insert;
pub mod query;
pub mod update;
mod validate;

#[cfg(test)]
mod test;

use query::{get_vaccine_course, get_vaccine_courses};

pub trait VaccineCourseServiceTrait: Sync + Send {
    fn get_vaccine_courses(
        &self,
        connection: &StorageConnection,
        pagination: Option<PaginationOption>,
        filter: Option<VaccineCourseFilter>,
        sort: Option<VaccineCourseSort>,
    ) -> Result<ListResult<VaccineCourseRow>, ListError> {
        get_vaccine_courses(connection, pagination, filter, sort)
    }

    fn get_vaccine_course(
        &self,
        connection: &StorageConnection,
        id: String,
    ) -> Result<VaccineCourseRow, SingleRecordError> {
        get_vaccine_course(connection, id)
    }

    fn insert_vaccine_course(
        &self,
        ctx: &ServiceContext,
        input: insert::InsertVaccineCourse,
    ) -> Result<VaccineCourseRow, insert::InsertVaccineCourseError> {
        insert::insert_vaccine_course(ctx, input)
    }

    fn update_vaccine_course(
        &self,
        ctx: &ServiceContext,
        input: update::UpdateVaccineCourse,
    ) -> Result<VaccineCourseRow, update::UpdateVaccineCourseError> {
        update::update_vaccine_course(ctx, input)
    }
}

pub struct VaccineCourseService {}
impl VaccineCourseServiceTrait for VaccineCourseService {}
