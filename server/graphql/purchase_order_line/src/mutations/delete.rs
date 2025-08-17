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

#[derive(Union)]
#[graphql(name = "DeletePurchaseOrderLineResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

#[derive(SimpleObject)]
#[graphql(name = "DeletePurchaseOrderLineResponseWithId")]
pub struct DeleteResponseWithId {
    pub id: String,
    pub response: DeleteResponse,
}

pub fn delete_purchase_order_lines(
    ctx: &Context<'_>,
    store_id: &str,
    ids: Vec<String>,
) -> Result<Vec<DeleteResponseWithId>> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePurchaseOrder,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let mut results = Vec::new();

    for id in ids {
        let result = map_response(
            service_provider
                .purchase_order_line_service
                .delete_purchase_order_line(&service_context, id.clone()),
        );

        results.push(DeleteResponseWithId {
            id,
            response: result?,
        });
    }

    Ok(results)
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
