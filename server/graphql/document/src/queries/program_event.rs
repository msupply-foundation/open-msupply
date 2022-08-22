use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{
    EqualFilter, PaginationOption, ProgramEventFilter, ProgramEventSort, ProgramEventSortField,
};
use service::auth::{Resource, ResourceAccessRequest};

use crate::types::{program::ProgramEventFilterInput, program_event::ProgramEventNode};

#[derive(SimpleObject)]
pub struct ProgramEventConnector {
    pub total_count: u32,
    pub nodes: Vec<ProgramEventNode>,
}

#[derive(Union)]
pub enum ProgramEventResponse {
    Response(ProgramEventConnector),
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum ProgramEventSortFieldInput {
    Datetime,
    Context,
    Group,
    Type,
}

#[derive(InputObject)]
pub struct ProgramEventSortInput {
    /// Sort query result by `key`
    key: ProgramEventSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

pub fn program_events(
    ctx: &Context<'_>,
    store_id: String,
    patient_id: String,
    page: Option<PaginationInput>,
    sort: Option<ProgramEventSortInput>,
    filter: Option<ProgramEventFilterInput>,
) -> Result<ProgramEventResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryProgram,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let filter = filter
        .map(|f| f.to_domain())
        .unwrap_or(ProgramEventFilter::new().name_id(EqualFilter::equal_to(&patient_id)));
    let list_result = service_provider
        .program_event_service
        .events(
            &context,
            page.map(PaginationOption::from),
            Some(filter),
            sort.map(ProgramEventSortInput::to_domain),
        )
        .map_err(StandardGraphqlError::from_list_error)?;
    let nodes: Vec<ProgramEventNode> = list_result
        .rows
        .into_iter()
        .map(|row| ProgramEventNode { row })
        .collect();

    Ok(ProgramEventResponse::Response(ProgramEventConnector {
        total_count: list_result.count,
        nodes,
    }))
}

impl ProgramEventSortInput {
    pub fn to_domain(self) -> ProgramEventSort {
        let key = match self.key {
            ProgramEventSortFieldInput::Datetime => ProgramEventSortField::Datetime,
            ProgramEventSortFieldInput::Context => ProgramEventSortField::Context,
            ProgramEventSortFieldInput::Group => ProgramEventSortField::Group,
            ProgramEventSortFieldInput::Type => ProgramEventSortField::Type,
        };

        ProgramEventSort {
            key,
            desc: self.desc,
        }
    }
}
