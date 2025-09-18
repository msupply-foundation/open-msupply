use async_graphql::*;

use crate::query::{get_shipping_methods, ShippingMethodFilterInput, ShippingMethodsResponse};

pub mod query;

#[derive(Default, Clone)]
pub struct ShippingMethodQueries;

#[Object]
impl ShippingMethodQueries {
    pub async fn shipping_methods(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        filter: Option<ShippingMethodFilterInput>,
    ) -> Result<ShippingMethodsResponse> {
        get_shipping_methods(ctx, &store_id, filter)
    }
}
