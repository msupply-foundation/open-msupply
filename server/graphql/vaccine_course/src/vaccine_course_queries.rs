use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterStringInput, StringFilterInput},
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{VaccineCourseDoseNode, VaccineCourseDoseResponse, VaccineCourseNode};
use repository::vaccine_course::vaccine_course::{
    VaccineCourseFilter, VaccineCourseSort, VaccineCourseSortField,
};
use repository::{EqualFilter, PaginationOption, RepositoryError, StringFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    vaccine_course::query::{get_vaccine_course, get_vaccine_course_dose, get_vaccine_courses},
    ListError,
};

use crate::types::vaccine_course::{
    VaccineCourseConnector, VaccineCourseResponse, VaccineCoursesResponse,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::vaccine_course::vaccine_course::VaccineCourseSortField")]
pub enum VaccineCourseSortFieldInput {
    Name,
}

#[derive(InputObject)]

pub struct VaccineCourseSortInput {
    key: VaccineCourseSortFieldInput,
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]

pub struct VaccineCourseFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<StringFilterInput>,
    pub program_id: Option<EqualFilterStringInput>,
}

pub async fn vaccine_courses(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<VaccineCourseFilterInput>,
    sort: Option<Vec<VaccineCourseSortInput>>,
) -> Result<VaccineCoursesResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryVaccineCourse,
            store_id: None,
        },
    )?;
    let service_provider = ctx.service_provider_data();
    let pagination = page.map(PaginationOption::from);
    let domain_filter = filter.map(|filter| filter.to_domain());
    let domain_sort = sort
        .and_then(|mut sort_list| sort_list.pop())
        .map(|sort| sort.to_domain());

    let items = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
        let connection = service_provider.connection()?;
        get_vaccine_courses(&connection, pagination, domain_filter, domain_sort)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(VaccineCoursesResponse::Response(
        VaccineCourseConnector::from_domain(items),
    ))
}

pub async fn vaccine_course(ctx: &Context<'_>, id: String) -> Result<VaccineCourseResponse> {
    let service_provider = ctx.service_provider_data();

    let result = tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
        let connection = service_provider.connection()?;
        Ok(get_vaccine_course(&connection, id))
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    match result {
        Ok(row) => Ok(VaccineCourseResponse::Response(
            VaccineCourseNode::from_domain(row),
        )),
        Err(error) => Ok(VaccineCourseResponse::Error(error.into())),
    }
}

pub async fn vaccine_course_dose(
    ctx: &Context<'_>,
    id: String,
) -> Result<VaccineCourseDoseResponse> {
    let service_provider = ctx.service_provider_data();

    let result = tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
        let connection = service_provider.connection()?;
        Ok(get_vaccine_course_dose(&connection, id))
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    match result {
        Ok(row) => Ok(VaccineCourseDoseResponse::Response(
            VaccineCourseDoseNode::from_domain(row),
        )),
        Err(error) => Ok(VaccineCourseDoseResponse::Error(error.into())),
    }
}

impl VaccineCourseFilterInput {
    pub fn to_domain(self) -> VaccineCourseFilter {
        let VaccineCourseFilterInput {
            id,
            name,
            program_id,
        } = self;

        VaccineCourseFilter {
            id: id.map(EqualFilter::from),
            name: name.map(StringFilter::from),
            program_id: program_id.map(EqualFilter::from),
            include_deleted: None,
        }
    }
}

impl VaccineCourseSortInput {
    pub fn to_domain(self) -> VaccineCourseSort {
        VaccineCourseSort {
            key: VaccineCourseSortField::from(self.key),
            desc: self.desc,
        }
    }
}
