use async_graphql::*;
use chrono::{DateTime, Utc};
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{
    program_enrolment::ProgramEventFilterInput,
    program_event::{
        ProgramEventConnector, ProgramEventNode, ProgramEventResponse, ProgramEventSortInput,
    },
};
use repository::PaginationOption;
use service::auth::{Resource, ResourceAccessRequest};
use service::ListError;

pub async fn program_events(
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
    let allowed_ctx = user.capabilities().clone();

    let service_provider = ctx.service_provider_data();

    let connector = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
        let context = service_provider.basic_context()?;
        let list_result = service_provider.program_event_service.events(
            &context,
            page.map(PaginationOption::from),
            filter.map(ProgramEventFilterInput::to_domain),
            sort.map(ProgramEventSortInput::to_domain),
            Some(&allowed_ctx),
        )?;
        let nodes: Vec<ProgramEventNode> = list_result
            .rows
            .into_iter()
            .map(|row| ProgramEventNode {
                store_id: store_id.clone(),
                program_event: row,
                allowed_ctx: allowed_ctx.clone(),
            })
            .collect();
        Ok(ProgramEventConnector {
            total_count: list_result.count,
            nodes,
        })
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(ProgramEventResponse::Response(connector))
}

pub async fn active_program_events(
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
    let allowed_ctx = user.capabilities().clone();
    let service_provider = ctx.service_provider_data();

    let connector = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
        let context = service_provider.basic_context()?;
        let list_result = service_provider.program_event_service.active_events(
            &context,
            at.map(|at| at.naive_utc())
                .unwrap_or(Utc::now().naive_utc()),
            page.map(PaginationOption::from),
            filter.map(ProgramEventFilterInput::to_domain),
            sort.map(ProgramEventSortInput::to_domain),
            Some(&allowed_ctx),
        )?;
        let nodes: Vec<ProgramEventNode> = list_result
            .rows
            .into_iter()
            .map(|row| ProgramEventNode {
                store_id: store_id.clone(),
                program_event: row,
                allowed_ctx: allowed_ctx.clone(),
            })
            .collect();
        Ok(ProgramEventConnector {
            total_count: list_result.count,
            nodes,
        })
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(ProgramEventResponse::Response(connector))
}
