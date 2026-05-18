use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::patient::{PatientFilterInput, PatientNode};
use repository::{
    EqualFilter, PaginationOption, PatientFilter, PatientSort, PatientSortField, RepositoryError,
};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(SimpleObject)]
pub struct PatientConnector {
    pub total_count: u32,
    pub nodes: Vec<PatientNode>,
}

#[derive(Union)]
pub enum PatientResponse {
    Response(PatientConnector),
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::db_diesel::patient::PatientSortField")]
pub enum PatientSortFieldInput {
    Name,
    Code,
    Code2,
    FirstName,
    LastName,
    Gender,
    DateOfBirth,
    Phone,
    Address1,
    Address2,
    Country,
    Email,
    DateOfDeath,
    CreatedDatetime,
}

#[derive(InputObject)]
pub struct PatientSortInput {
    /// Sort query result by `key`
    key: PatientSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

impl PatientSortInput {
    fn to_domain(self) -> PatientSort {
        PatientSort {
            key: PatientSortField::from(self.key),
            desc: self.desc,
        }
    }
}

pub async fn patients(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<PatientFilterInput>,
    sort: Option<Vec<PatientSortInput>>,
) -> Result<PatientResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPatient,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let allowed_ctx = user.capabilities().clone();

    let service_provider = ctx.service_provider_data();

    let connector = tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
        let context = service_provider.basic_context()?;
        let patients = service_provider.patient_service.get_patients(
            &context,
            page.map(PaginationOption::from),
            filter.map(PatientFilter::from),
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
            Some(&allowed_ctx),
        )?;
        let nodes: Vec<PatientNode> = patients
            .rows
            .into_iter()
            .map(|patient| PatientNode {
                store_id: store_id.clone(),
                patient,
                allowed_ctx: allowed_ctx.clone(),
            })
            .collect();
        Ok(PatientConnector {
            total_count: patients.count,
            nodes,
        })
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(PatientResponse::Response(connector))
}

pub async fn patient(
    ctx: &Context<'_>,
    store_id: String,
    patient_id: String,
) -> Result<Option<PatientNode>> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPatient,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let allowed_ctx = user.capabilities().clone();

    let service_provider = ctx.service_provider_data();

    let node = tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
        let context = service_provider.basic_context()?;
        Ok(service_provider
            .patient_service
            .get_patients(
                &context,
                None,
                Some(PatientFilter::new().id(EqualFilter::equal_to(patient_id.to_string()))),
                None,
                Some(&allowed_ctx),
            )?
            .rows
            .pop()
            .map(|patient| PatientNode {
                store_id: store_id.clone(),
                patient,
                allowed_ctx: allowed_ctx.clone(),
            }))
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(node)
}
