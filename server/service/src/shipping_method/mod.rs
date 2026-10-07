use self::query::get_shipping_methods;
use crate::{ListError, ListResult, service_provider::ServiceContext};
use repository::shipping_method::{ShippingMethod, ShippingMethodFilter};

pub mod query;

pub trait ShippingMethodServiceTrait: Sync + Send {
    fn get_shipping_methods(
        &self,
        ctx: &ServiceContext,
        filter: Option<ShippingMethodFilter>,
    ) -> Result<ListResult<ShippingMethod>, ListError> {
        get_shipping_methods(ctx, filter)
    }
}

pub struct ShippingMethodService {}
impl ShippingMethodServiceTrait for ShippingMethodService {}
