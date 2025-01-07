use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::ContextExt;
use graphql_types::types::DiagnosisNode;
use service::auth::{Resource, ResourceAccessRequest};
use service::diagnosis::get_all_active_diagnoses;

pub fn diagnoses_active(ctx: &Context<'_>) -> Result<Vec<DiagnosisNode>> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::NoPermissionRequired,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let rows = get_all_active_diagnoses(connection_manager)?;

    Ok(DiagnosisNode::from_vec(rows))
}
