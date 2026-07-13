use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_types::types::DeleteResponse;
use service::stock_relocation_line::DeleteStockRelocationLineError as DeleteLineServiceError;

#[derive(Union)]
#[graphql(name = "DeleteStockRelocationLineResponse")]
pub enum DeleteLineResponse {
    Response(DeleteResponse),
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
