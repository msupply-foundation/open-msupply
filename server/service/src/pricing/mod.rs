use crate::service_provider::ServiceContext;
use item_price::{get_pricing_for_item, ItemPrice, ItemPriceLookup};
use repository::RepositoryError;

pub mod item_price;

pub trait PricingServiceTrait: Sync + Send {
    fn get_pricing_for_item(
        &self,
        ctx: &ServiceContext,
        input: ItemPriceLookup,
    ) -> Result<Option<ItemPrice>, RepositoryError> {
        get_pricing_for_item(ctx, input)
    }
}

pub struct PricingService {}
impl PricingServiceTrait for PricingService {}

#[cfg(test)]
mod tests;