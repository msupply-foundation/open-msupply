use async_graphql::*;
use chrono::{DateTime, Utc};
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{PaginationOption, ProgramEventFilter, ProgramEventSort, ProgramEventSortField};
use service::auth::{CapabilityTag, Resource, ResourceAccessRequest};

use crate::types::{program_enrolment::ProgramEventFilterInput, program_event::ProgramEventNode};

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
    DocumentType,
    DocumentName,
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
    page: Option<PaginationInput>,
    sort: Option<ProgramEventSortInput>,
    filter: Option<ProgramEventFilterInput>,
) -> Result<ProgramEventResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryProgram,
            store_id: Some(store_id.clone()),
        },
    )?;
    let allowed_ctx = user.capabilities(CapabilityTag::ContextType);

    let mut filter = filter
        .map(|f| f.to_domain())
        .unwrap_or(ProgramEventFilter::new());
    // restrict query results to allowed entries
    filter.context_id = Some(
        filter
            .context_id
            .unwrap_or_default()
            .restrict_results(&allowed_ctx),
    );

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

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
        .map(|row| ProgramEventNode {
            store_id: store_id.clone(),
            row,
            allowed_ctx: allowed_ctx.clone(),
        })
        .collect();

    Ok(ProgramEventResponse::Response(ProgramEventConnector {
        total_count: list_result.count,

        nodes,
    }))
}

pub fn active_program_events(
    ctx: &Context<'_>,
    store_id: String,
    at: Option<DateTime<Utc>>,
    page: Option<PaginationInput>,
    sort: Option<ProgramEventSortInput>,
    filter: Option<ProgramEventFilterInput>,
) -> Result<ProgramEventResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryProgram,
            store_id: Some(store_id.clone()),
        },
    )?;
    let allowed_ctx = user.capabilities(CapabilityTag::ContextType);

    let mut filter = filter
        .map(|f| f.to_domain())
        .unwrap_or(ProgramEventFilter::new());
    // restrict query results to allowed entries
    filter.context_id = Some(
        filter
            .context_id
            .unwrap_or_default()
            .restrict_results(&allowed_ctx),
    );

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let list_result = service_provider
        .program_event_service
        .active_events(
            &context,
            at.map(|at| at.naive_utc())
                .unwrap_or(Utc::now().naive_utc()),
            page.map(PaginationOption::from),
            Some(filter),
            sort.map(ProgramEventSortInput::to_domain),
        )
        .map_err(StandardGraphqlError::from_list_error)?;
    let nodes: Vec<ProgramEventNode> = list_result
        .rows
        .into_iter()
        .map(|row| ProgramEventNode {
            store_id: store_id.clone(),
            row,
            allowed_ctx: allowed_ctx.clone(),
        })
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
            ProgramEventSortFieldInput::DocumentType => ProgramEventSortField::DocumentType,
            ProgramEventSortFieldInput::DocumentName => ProgramEventSortField::DocumentName,
            ProgramEventSortFieldInput::Type => ProgramEventSortField::Type,
        };

        ProgramEventSort {
            key,
            desc: self.desc,
        }
    }
}
