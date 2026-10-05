use async_graphql::*;
use graphql_core::{
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{
    ForecastMethodNode, ForecastMethodNotAvailable, RequisitionLineForecastPreviewNode,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition_line::request_requisition_line::{
        RequisitionLineForecastPreviewError as ServiceError,
        RequisitionLineForecastPreviewInput as ServiceInput,
    },
};

#[derive(InputObject)]
pub struct RequisitionLineForecastPreviewInput {
    pub requisition_id: String,
    pub item_id: String,
    /// Null keeps the line's own method: an existing line's stored one, or the default a
    /// new line would take
    pub forecast_method: Option<ForecastMethodNode>,
}

#[derive(Interface)]
#[graphql(name = "RequisitionLineForecastPreviewErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum PreviewErrorInterface {
    RecordNotFound(RecordNotFound),
    ForecastMethodNotAvailable(ForecastMethodNotAvailable),
}

#[derive(SimpleObject)]
#[graphql(name = "RequisitionLineForecastPreviewError")]
pub struct PreviewError {
    pub error: PreviewErrorInterface,
}

#[derive(Union)]
#[graphql(name = "RequisitionLineForecastPreviewResponse")]
pub enum PreviewResponse {
    Response(RequisitionLineForecastPreviewNode),
    Error(PreviewError),
}

pub fn forecast_preview(
    ctx: &Context<'_>,
    store_id: &str,
    input: RequisitionLineForecastPreviewInput,
) -> Result<PreviewResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryRequisition,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = match service_provider
        .requisition_line_service
        .get_requisition_line_forecast_preview(&service_context, input.to_domain())
    {
        Ok(preview) => {
            PreviewResponse::Response(RequisitionLineForecastPreviewNode::from_domain(preview))
        }
        Err(error) => PreviewResponse::Error(PreviewError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

impl RequisitionLineForecastPreviewInput {
    fn to_domain(self) -> ServiceInput {
        let RequisitionLineForecastPreviewInput {
            requisition_id,
            item_id,
            forecast_method,
        } = self;
        ServiceInput {
            requisition_id,
            item_id,
            forecast_method: forecast_method.map(ForecastMethodNode::into),
        }
    }
}

fn map_error(error: ServiceError) -> Result<PreviewErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        // Structured Errors
        ServiceError::RequisitionDoesNotExist | ServiceError::ItemDoesNotExist => {
            return Ok(PreviewErrorInterface::RecordNotFound(RecordNotFound))
        }
        ServiceError::ForecastMethodNotAvailable(reason) => {
            return Ok(PreviewErrorInterface::ForecastMethodNotAvailable(
                ForecastMethodNotAvailable {
                    unavailable_reason: reason.into(),
                },
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreRequisition => Forbidden(formatted_error),
        ServiceError::NotARequestRequisition => BadUserInput(formatted_error),
        ServiceError::PluginError(_) => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
