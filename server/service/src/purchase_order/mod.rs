use self::query::{get_purchase_order, get_purchase_orders};
pub mod query;

pub trait PurchaseOrderServiceTrait: Sync + Send {
    fn get_purchase_order(
        ctx: &Context<'_>,
        store_id: &str,
        id: String,
    ) -> Result<PurchaseOrderResponse> {
        get_purchase_order(ctx, store_id, id)
    }

    fn get_purchase_orders(
        ctx: &Context<'_>,
        store_id: &str,
        pagination: Option<PaginationInput>,
        filter: Option<PurchaseOrderFilterInput>,
        sort: Option<Vec<PurchaseOrderSortInput>>,
    ) -> Result<PurchaseOrdersResponse> {
        get_purchase_orders(ctx, store_id, pagination, filter, sort)
    }
}

pub struct PurchaseOrderService;
impl PurchaseOrderServiceTrait for PurchaseOrderService {}
