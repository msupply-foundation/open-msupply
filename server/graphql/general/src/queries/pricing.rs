use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use service::{
    auth::{Resource, ResourceAccessRequest},
    pricing::item_price::ItemPriceLookup,
};

#[derive(InputObject, Clone)]
pub struct ItemPriceInput {
    item_id: String,
    name_id: Option<String>, // Name Id can be used to get discount for a specific name
}

pub async fn item_price(ctx: &Context<'_>, store_id: String, input: ItemPriceInput) -> Result<f64> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryItems,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id, user.user_id)?;

    let pricing = service_provider
        .pricing_service
        .get_pricing_for_item(&service_context, input.to_domain())
        .map_err(|e| StandardGraphqlError::from_repository_error(e))?;

    Ok(-123.0) // TODO!
}

impl ItemPriceInput {
    pub fn to_domain(self) -> ItemPriceLookup {
        let ItemPriceInput { name_id, item_id } = self;

        ItemPriceLookup {
            customer_name_id: name_id,
            item_id,
        }
    }
}
