use async_graphql::*;
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput},
    map_filter,
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{
    DatetimeFilter, EncounterFilter, EncounterSort, EncounterSortField, EqualFilter,
    PaginationOption,
};
use service::auth::{Resource, ResourceAccessRequest};

use crate::types::encounter::{EncounterNode, EncounterNodeStatus};

#[derive(SimpleObject)]
pub struct EncounterConnector {
    pub total_count: u32,
    pub nodes: Vec<EncounterNode>,
}

#[derive(Union)]
pub enum EncounterResponse {
    Response(EncounterConnector),
}

#[derive(InputObject, Clone)]
pub struct EqualFilterEncounterStatusInput {
    pub equal_to: Option<EncounterNodeStatus>,
    pub equal_any: Option<Vec<EncounterNodeStatus>>,
    pub not_equal_to: Option<EncounterNodeStatus>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum EncounterSortFieldInput {
    Type,
    PatientId,
    Program,
    StartDatetime,
    EndDatetime,
    Status,
}

#[derive(InputObject)]
pub struct EncounterSortInput {
    /// Sort query result by `key`
    key: EncounterSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct EncounterFilterInput {
    pub patient_id: Option<EqualFilterStringInput>,
    pub program: Option<EqualFilterStringInput>,
    pub name: Option<EqualFilterStringInput>,
    pub start_datetime: Option<DatetimeFilterInput>,
    pub end_datetime: Option<DatetimeFilterInput>,
    pub status: Option<EqualFilterEncounterStatusInput>,
}

fn to_domain_filter(f: EncounterFilterInput) -> EncounterFilter {
    EncounterFilter {
        patient_id: f.patient_id.map(EqualFilter::from),
        program: f.program.map(EqualFilter::from),
        name: f.name.map(EqualFilter::from),
        start_datetime: f.start_datetime.map(DatetimeFilter::from),
        status: f
            .status
            .map(|s| map_filter!(s, EncounterNodeStatus::to_domain)),
        end_datetime: f.end_datetime.map(DatetimeFilter::from),
    }
}

pub fn encounters(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<EncounterFilterInput>,
    sort: Option<EncounterSortInput>,
) -> Result<EncounterResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryEncounter,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.context()?;

    let result = service_provider
        .encounter_service
        .get_patient_program_encounters(
            &context,
            page.map(PaginationOption::from),
            filter.map(to_domain_filter),
            sort.map(EncounterSortInput::to_domain),
        )
        .map_err(StandardGraphqlError::from_list_error)?;
    let nodes = result
        .rows
        .into_iter()
        .map(|encounter_row| EncounterNode {
            store_id: store_id.clone(),
            encounter_row,
        })
        .collect();

    Ok(EncounterResponse::Response(EncounterConnector {
        total_count: result.count,
        nodes,
    }))
}

impl EncounterSortInput {
    pub fn to_domain(self) -> EncounterSort {
        let key = match self.key {
            EncounterSortFieldInput::Type => EncounterSortField::Type,
            EncounterSortFieldInput::PatientId => EncounterSortField::PatientId,
            EncounterSortFieldInput::Program => EncounterSortField::Program,
            EncounterSortFieldInput::StartDatetime => EncounterSortField::StartDatetime,
            EncounterSortFieldInput::EndDatetime => EncounterSortField::EndDatetime,
            EncounterSortFieldInput::Status => EncounterSortField::Status,
        };

        EncounterSort {
            key,
            desc: self.desc,
        }
    }
}
