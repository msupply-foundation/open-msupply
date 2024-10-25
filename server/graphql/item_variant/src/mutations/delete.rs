use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::DeleteResponse;
use service::auth::{Resource, ResourceAccessRequest};

#[derive(InputObject)]
pub struct DeleteItemVariantInput {
    pub id: String,
}

#[derive(Union)]
pub enum DeleteItemVariantResponse {
    Response(DeleteResponse),
}

pub fn delete_item_variant(
    ctx: &Context<'_>,
    store_id: String,
    input: DeleteItemVariantInput,
) -> Result<DeleteItemVariantResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateItemNamesCodesAndUnits,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    Ok(DeleteItemVariantResponse::Response(DeleteResponse(
        input.id,
    )))
}

// impl DeleteItemVariantInput {
//     pub fn to_domain(self) -> ServiceInput {
//         let DeleteItemVariantInput { id } = self;

//         ServiceInput { id }
//     }
// }

// fn map_response(from: Result<String, ServiceError>) -> Result<DeleteItemVariantResponse> {
//     match from {
//         Ok(result) => Ok(DeleteItemVariantResponse::Response(DeleteResponse(result))),
//         Err(error) => {
//             use ServiceError::*;
//             let formatted_error = format!("{:#?}", error);

//             let graphql_error = match error {
//                 CouldNotDeleteItemVariant | ItemVariantDoesNotExist => {
//                     StandardGraphqlError::BadUserInput(formatted_error)
//                 }
//                 ServiceError::DatabaseError(_) => {
//                     StandardGraphqlError::InternalError(formatted_error)
//                 }
//             };

//             Err(graphql_error.extend())
//         }
//     }
// }
