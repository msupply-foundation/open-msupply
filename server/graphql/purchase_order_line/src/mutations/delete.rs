use async_graphql::*;
use graphql_core::{
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::DeleteResponse as GenericDeleteResponse;
use service::{
    auth::{Resource, ResourceAccessRequest},
    purchase_order_line::delete::DeletePurchaseOrderLineError as ServiceError,
};

#[derive(Interface)]
#[graphql(name = "DeletePurchaseOrderLineInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
}

#[derive(SimpleObject)]
#[graphql(name = "DeletePurchaseOrderLineError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(InputObject)]
#[graphql(name = "DeletePurchaseOrderLineInput")]
pub struct DeleteInput {
    pub id: String,
}

impl DeleteInput {
    pub fn to_domain(&self) -> String {
        self.id.clone()
    }
}

#[derive(Union)]
#[graphql(name = "DeletePurchaseOrderLineResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

pub fn delete_purchase_order_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: DeleteInput,
) -> Result<DeleteResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePurchaseOrder,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .purchase_order_line_service
            .delete_purchase_order_line(&service_context, input.to_domain()),
    )
}

fn map_response(from: Result<String, ServiceError>) -> Result<DeleteResponse> {
    let result = match from {
        Ok(id) => DeleteResponse::Response(GenericDeleteResponse(id)),
        Err(error) => DeleteResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<DeleteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::PurchaseOrderLineDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::PurchaseOrderDoesNotExist | ServiceError::CannotEditPurchaseOrder => {
            BadUserInput(formatted_error)
        }
    };

    Err(graphql_error.extend())
}
