use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use graphql_types::types::VaccineCourseDoseResponse;
use mutations::{
    delete_vaccine_course, insert_vaccine_course, update_vaccine_course,
    DeleteVaccineCourseResponse, InsertVaccineCourseInput, InsertVaccineCourseResponse,
    UpdateVaccineCourseInput, UpdateVaccineCourseResponse,
};
use types::vaccine_course::{VaccineCourseResponse, VaccineCoursesResponse};

pub mod vaccine_course_queries;
use crate::vaccine_course_queries::*;
pub mod mutations;
pub mod types;

#[derive(Default, Clone)]
pub struct VaccineCourseQueries;
#[Object]
impl VaccineCourseQueries {
    pub async fn vaccine_courses(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<VaccineCourseFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<VaccineCourseSortInput>>,
    ) -> Result<VaccineCoursesResponse> {
        vaccine_courses(ctx, page, filter, sort)
    }

    pub async fn vaccine_course(
        &self,
        ctx: &Context<'_>,
        id: String,
    ) -> Result<VaccineCourseResponse> {
        vaccine_course(ctx, id)
    }

    pub async fn vaccine_course_dose(
        &self,
        ctx: &Context<'_>,
        id: String,
    ) -> Result<VaccineCourseDoseResponse> {
        vaccine_course_dose(ctx, id)
    }
}

#[derive(Default, Clone)]
pub struct VaccineCourseMutations;

#[Object]
impl VaccineCourseMutations {
    async fn insert_vaccine_course(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertVaccineCourseInput,
    ) -> Result<InsertVaccineCourseResponse> {
        insert_vaccine_course(ctx, &store_id, input)
    }

    async fn update_vaccine_course(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateVaccineCourseInput,
    ) -> Result<UpdateVaccineCourseResponse> {
        update_vaccine_course(ctx, &store_id, input)
    }

    async fn delete_vaccine_course(
        &self,
        ctx: &Context<'_>,
        vaccine_course_id: String,
    ) -> Result<DeleteVaccineCourseResponse> {
        delete_vaccine_course(ctx, &vaccine_course_id)
    }
}
