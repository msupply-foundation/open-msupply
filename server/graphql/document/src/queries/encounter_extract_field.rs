use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::PaginationOption;
use service::{
    auth::{Resource, ResourceAccessRequest},
    document::encounter::extract_encounter_fields::{ExtractFieldInput, ExtractFieldResult},
};

use crate::types::encounter::EncounterNode;

use super::{EncounterFilterInput, EncounterSortInput};

#[derive(InputObject, Clone)]
pub struct EncounterExtractFieldsInput {
    pub fields: Vec<String>,
}

pub struct EncounterExtractFieldsNode {
    pub store_id: String,
    pub extract_result: ExtractFieldResult,
}

#[derive(SimpleObject)]
pub struct EncounterExtractFieldConnector {
    pub total_count: u32,
    pub nodes: Vec<EncounterExtractFieldsNode>,
}

#[derive(Union)]
pub enum EncounterExtractFieldResponse {
    Response(EncounterExtractFieldConnector),
}

#[Object]
impl EncounterExtractFieldsNode {
    pub async fn encounter(&self) -> EncounterNode {
        EncounterNode {
            store_id: self.store_id.clone(),
            encounter_row: self.extract_result.row.clone(),
        }
    }

    pub async fn fields(&self) -> &Vec<serde_json::Value> {
        &self.extract_result.fields
    }
}

pub fn encounter_extract_fields(
    ctx: &Context<'_>,
    store_id: String,
    input: EncounterExtractFieldsInput,
    page: Option<PaginationInput>,
    filter: Option<EncounterFilterInput>,
    sort: Option<EncounterSortInput>,
) -> Result<EncounterExtractFieldResponse> {
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
        .extract_encounters_fields(
            &context,
            ExtractFieldInput {
                fields: input.fields,
            },
            page.map(PaginationOption::from),
            filter.map(|f| f.to_domain_filter()),
            sort.map(EncounterSortInput::to_domain),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    let nodes = result
        .rows
        .into_iter()
        .map(|extract_result| EncounterExtractFieldsNode {
            store_id: store_id.clone(),
            extract_result,
        })
        .collect();

    Ok(EncounterExtractFieldResponse::Response(
        EncounterExtractFieldConnector {
            total_count: result.count,
            nodes,
        },
    ))
}
