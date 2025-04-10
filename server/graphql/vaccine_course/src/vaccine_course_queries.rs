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
use repository::{EqualFilter, PaginationOption, StringFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    vaccine_course::query::{get_vaccine_course, get_vaccine_course_dose, get_vaccine_courses},
};

use crate::types::vaccine_course::{
    VaccineCourseConnector, VaccineCourseResponse, VaccineCoursesResponse,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::vaccine_course::vaccine_course::VaccineCourseSortField")]
#[graphql(rename_items = "camelCase")]

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

pub fn vaccine_courses(
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
    let connection = ctx.get_connection_manager().connection()?;
    let items = get_vaccine_courses(
        &connection,
        page.map(PaginationOption::from),
        filter.map(|filter| filter.to_domain()),
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(VaccineCoursesResponse::Response(
        VaccineCourseConnector::from_domain(items),
    ))
}

pub fn vaccine_course(ctx: &Context<'_>, id: String) -> Result<VaccineCourseResponse> {
    let connection = ctx.get_connection_manager().connection()?;

    match get_vaccine_course(&connection, id) {
        Ok(row) => Ok(VaccineCourseResponse::Response(
            VaccineCourseNode::from_domain(row),
        )),
        Err(error) => Ok(VaccineCourseResponse::Error(error.into())),
    }
}

pub fn vaccine_course_dose(ctx: &Context<'_>, id: String) -> Result<VaccineCourseDoseResponse> {
    let connection = ctx.get_connection_manager().connection()?;

    match get_vaccine_course_dose(&connection, id) {
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
        use VaccineCourseSortField as to;
        use VaccineCourseSortFieldInput as from;
        let key = match self.key {
            from::Name => to::Name,
        };

        VaccineCourseSort {
            key,
            desc: self.desc,
        }
    }
}
