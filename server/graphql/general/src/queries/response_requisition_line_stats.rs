use async_graphql::*;
use graphql_core::{
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::ResponseRequisitionStatsNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition_line::response_line_stats::ResponseRequisitionStatsError,
};

type ServiceError = ResponseRequisitionStatsError;

#[derive(Interface)]
#[graphql(name = "RequisitionLineStatsErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum RequisitionStatsErrorInterface {
    RecordNotFound(RecordNotFound),
}

#[derive(SimpleObject)]
#[graphql(name = "RequisitionLineStatsError")]
pub struct RequisitionStatsError {
    pub error: RequisitionStatsErrorInterface,
}

#[derive(Union)]
#[graphql(name = "RequisitionLineStatsResponse")]
pub enum RequisitionStatsResponse {
    Response(ResponseRequisitionStatsNode),
    Error(RequisitionStatsError),
}

pub async fn response_requisition_stats(
    ctx: &Context<'_>,
    store_id: &str,
    requisition_line_id: &str,
) -> Result<RequisitionStatsResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::RequisitionStats,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let store_id = store_id.to_string();
    let requisition_line_id = requisition_line_id.to_string();

    let result = tokio::task::spawn_blocking(move || -> Result<RequisitionStatsResponse> {
        let service_context = service_provider
            .context(store_id, "".to_string())
            .map_err(StandardGraphqlError::from_repository_error)?;

        Ok(match service_provider
            .requisition_line_service
            .get_response_requisition_line_stats(&service_context, &requisition_line_id)
        {
            Ok(result) => RequisitionStatsResponse::Response(
                ResponseRequisitionStatsNode::from_domain(result),
            ),
            Err(error) => RequisitionStatsResponse::Error(RequisitionStatsError {
                error: map_error(error)?,
            }),
        })
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<RequisitionStatsErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        // Structured Errors
        ServiceError::RequisitionLineDoesNotExist => {
            return Ok(RequisitionStatsErrorInterface::RecordNotFound(
                RecordNotFound,
            ))
        }
        // Standard Graphql Errors
        ServiceError::RequisitionLineDoesNotBelongToCurrentStore => Forbidden(formatted_error),
        ServiceError::NotAResponseRequisition => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
