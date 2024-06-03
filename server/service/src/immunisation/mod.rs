use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};

use repository::{
    immunisation::{
        vaccine_course::{VaccineCourseFilter, VaccineCourseSort},
        vaccine_course_row::VaccineCourseRow,
    },
    PaginationOption, StorageConnection,
};

pub mod vaccine_course;
mod validate;

use vaccine_course::query::{get_vaccine_course, get_vaccine_courses};

pub trait ImmunisationServiceTrait: Sync + Send {
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
        ctx: &ServiceContext,
        id: String,
    ) -> Result<VaccineCourseRow, SingleRecordError> {
        get_vaccine_course(ctx, id)
    }

    fn insert_vaccine_course(
        &self,
        ctx: &ServiceContext,
        input: vaccine_course::insert::InsertVaccineCourse,
    ) -> Result<VaccineCourseRow, vaccine_course::insert::InsertVaccineCourseError> {
        vaccine_course::insert::insert_vaccine_course(ctx, input)
    }
}

pub struct ImmunisationService {}
impl ImmunisationServiceTrait for ImmunisationService {}
