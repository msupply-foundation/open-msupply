use async_graphql::*;
use graphql_core::{
    ContextExt,
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};
use graphql_types::types::ItemVariantNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    item::item_variant::PromoteItemVariantError,
};

/// Makes an auto-created variant a real one, keeping its id. Errors are top-level
/// GraphQL errors.
pub fn promote_item_variant(
    ctx: &Context<'_>,
    store_id: String,
    id: String,
) -> Result<ItemVariantNode> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateItemNamesCodesAndUnits,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id, user.user_id)?;

    match service_provider
        .item_service
        .promote_item_variant(&service_context, &id)
    {
        Ok(variant) => Ok(ItemVariantNode::from_domain(variant)),
        Err(error) => {
            let formatted_error = format!("{error:#?}");
            let graphql_error = match error {
                PromoteItemVariantError::ItemVariantDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                PromoteItemVariantError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            Err(graphql_error.extend())
        }
    }
}
