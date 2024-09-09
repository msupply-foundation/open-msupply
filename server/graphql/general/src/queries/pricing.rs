use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use service::{
    auth::{Resource, ResourceAccessRequest},
    pricing::item_price::{ItemPrice, ItemPriceLookup},
};

#[derive(InputObject, Clone)]
pub struct ItemPriceInput {
    item_id: String,
    name_id: Option<String>, // Name Id could be used to get discount for a specific name
}

#[derive(PartialEq, Debug)]
pub struct ItemPriceNode {
    pricing: ItemPrice,
}

#[Object]
impl ItemPriceNode {
    pub async fn item_id(&self) -> &str {
        &self.pricing.item_id
    }

    pub async fn default_price_per_unit(&self) -> Option<f64> {
        self.pricing.default_price_per_unit
    }

    pub async fn discount_percentage(&self) -> Option<f64> {
        self.pricing.discount_percentage
    }

    pub async fn calculated_price_per_unit(&self) -> Option<f64> {
        self.pricing.calculated_price_per_unit
    }
}

#[derive(Union)]
pub enum ItemPriceResponse {
    Response(ItemPriceNode),
}

pub async fn item_price(
    ctx: &Context<'_>,
    store_id: String,
    input: ItemPriceInput,
) -> Result<ItemPriceResponse> {
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

    Ok(ItemPriceResponse::Response(ItemPriceNode { pricing }))
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
