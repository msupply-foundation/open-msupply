use async_graphql::*;
use graphql_core::{
    simple_generic_errors::MasterListNotFoundForThisStore,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::RequisitionLineConnector;
use repository::RequisitionLine;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition::response_requisition::{
        ResponseAddFromMasterList as ServiceInput, ResponseAddFromMasterListError as ServiceError,
    },
};

#[derive(InputObject)]
pub struct ResponseAddFromMasterListInput {
    pub response_requisition_id: String,
    pub master_list_id: String,
}

#[derive(Interface)]
#[graphql(name = "ResponseAddFromMasterListErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum ResponseAddFromMasterListErrorInterface {
    MasterListNotFoundForThisStore(MasterListNotFoundForThisStore),
}

#[derive(SimpleObject)]
#[graphql(name = "ResponseAddFromMasterListError")]
pub struct ResponseAddFromMasterListError {
    pub error: ResponseAddFromMasterListErrorInterface,
}

#[derive(Union)]
#[graphql(name = "ResponseAddFromMasterListResponse")]
pub enum ResponseAddFromMasterListResponse {
    Error(ResponseAddFromMasterListError),
    Response(RequisitionLineConnector),
}

pub fn response_add_from_master_list(
    ctx: &Context<'_>,
    store_id: &str,
    input: ResponseAddFromMasterListInput,
) -> Result<ResponseAddFromMasterListResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateRequisition,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .requisition_service
            .response_add_from_master_list(&service_context, input.to_domain()),
    )
}

impl ResponseAddFromMasterListInput {
    pub fn to_domain(self) -> ServiceInput {
        let ResponseAddFromMasterListInput {
            response_requisition_id,
            master_list_id,
        } = self;
        ServiceInput {
            response_requisition_id,
            master_list_id,
        }
    }
}

fn map_response(
    from: Result<Vec<RequisitionLine>, ServiceError>,
) -> Result<ResponseAddFromMasterListResponse> {
    let result = match from {
        Ok(requisition_lines) => ResponseAddFromMasterListResponse::Response(
            RequisitionLineConnector::from_vec(requisition_lines),
        ),
        Err(error) => ResponseAddFromMasterListResponse::Error(ResponseAddFromMasterListError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

pub fn map_error(error: ServiceError) -> Result<ResponseAddFromMasterListErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::MasterListNotFoundForThisStore => {
            return Ok(
                ResponseAddFromMasterListErrorInterface::MasterListNotFoundForThisStore(
                    MasterListNotFoundForThisStore,
                ),
            )
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreRequisition
        | ServiceError::NotAResponseRequisition
        | ServiceError::RequisitionDoesNotExist
        | ServiceError::CannotEditRequisition => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
