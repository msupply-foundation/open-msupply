use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use service::{
    auth::{Resource, ResourceAccessRequest},
    pricing::discount::ItemDiscountLookup,
};

#[derive(InputObject, Clone)]
pub struct ItemDiscountInput {
    name_id: String,
    item_id: String,
}

pub async fn sell_price_discount(
    ctx: &Context<'_>,
    store_id: String,
    input: ItemDiscountInput,
) -> Result<f64> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryMasterList, // Discount data comes from master list ...
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id, user.user_id)?;

    let discount = service_provider
        .pricing_service
        .get_discount_for_item_and_name_link_id(&service_context, input.to_domain())
        .map_err(|e| StandardGraphqlError::from_repository_error(e))?;

    Ok(discount)
}

impl ItemDiscountInput {
    pub fn to_domain(self) -> ItemDiscountLookup {
        let ItemDiscountInput { name_id, item_id } = self;

        ItemDiscountLookup { name_id, item_id }
    }
}
