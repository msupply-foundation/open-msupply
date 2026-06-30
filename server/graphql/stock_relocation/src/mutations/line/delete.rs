use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use graphql_types::types::DeleteResponse;
use service::auth::{Resource, ResourceAccessRequest};
use service::stock_relocation_line::DeleteStockRelocationLineError as DeleteLineServiceError;

#[derive(Union)]
#[graphql(name = "DeleteStockRelocationLineResponse")]
pub enum DeleteLineResponse {
    Response(DeleteResponse),
}

pub fn delete_stock_relocation_line(
    ctx: &Context<'_>,
    store_id: &str,
    id: String,
) -> Result<DeleteLineResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStockLine,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_delete_response(
        service_provider
            .stock_relocation_service
            .delete_stock_relocation_line(&service_context, store_id, id),
    )
}

pub fn map_delete_response(
    result: Result<String, DeleteLineServiceError>,
) -> Result<DeleteLineResponse> {
    match result {
        Ok(id) => Ok(DeleteLineResponse::Response(DeleteResponse(id))),
        Err(error) => Err(map_delete_line_error(error)),
    }
}

fn map_delete_line_error(error: DeleteLineServiceError) -> async_graphql::Error {
    use DeleteLineServiceError as E;
    let formatted_error = format!("{error:#?}");
    match error {
        E::LineDoesNotExist | E::NotThisStoreRelocation | E::StockRelocationFinalised => {
            BadUserInput(formatted_error)
        }
        E::DatabaseError(_) => InternalError(formatted_error),
    }
    .extend()
}
