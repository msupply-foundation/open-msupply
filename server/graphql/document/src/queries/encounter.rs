use async_graphql::*;
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput},
    map_filter,
    standard_graphql_error::validate_auth,
    ContextExt,
};
use repository::{DatetimeFilter, EncounterFilter, EqualFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    usize_to_u32,
};

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

#[derive(InputObject, Clone)]
pub struct EncounterFilterInput {
    pub patient_id: Option<EqualFilterStringInput>,
    pub program: Option<EqualFilterStringInput>,
    pub name: Option<EqualFilterStringInput>,
    pub encounter_datetime: Option<DatetimeFilterInput>,
    pub status: Option<EqualFilterEncounterStatusInput>,
}

fn to_domain_filter(f: EncounterFilterInput) -> EncounterFilter {
    EncounterFilter {
        patient_id: f.patient_id.map(EqualFilter::from),
        program: f.program.map(EqualFilter::from),
        name: f.name.map(EqualFilter::from),
        encounter_datetime: f.encounter_datetime.map(DatetimeFilter::from),
        status: f
            .status
            .map(|s| map_filter!(s, EncounterNodeStatus::to_domain)),
    }
}

pub fn encounters(
    ctx: &Context<'_>,
    store_id: String,
    filter: Option<EncounterFilterInput>,
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

    let nodes: Vec<EncounterNode> = service_provider
        .encounter_service
        .get_patient_program_encounters(&context, filter.map(to_domain_filter))?
        .into_iter()
        .map(|row| EncounterNode {
            store_id: store_id.clone(),
            patient_id: row.patient_id,
            program: row.program,
            name: row.name,
            status: row.status,
        })
        .collect();

    Ok(EncounterResponse::Response(EncounterConnector {
        total_count: usize_to_u32(nodes.len()),
        nodes,
    }))
}
