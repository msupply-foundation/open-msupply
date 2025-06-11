use std::collections::HashMap;

use actix_web::web::Data;
use async_graphql::dataloader::*;
use repository::PurchaseOrderLineRow;
use service::service_provider::ServiceProvider;
use util::inline_init;

pub struct PurchaseOrderLinesByPurchaseOrderIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for PurchaseOrderLinesByPurchaseOrderIdLoader {
    type Value = Vec<PurchaseOrderLineRow>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        _purchase_order_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let mut result: HashMap<String, Vec<PurchaseOrderLineRow>> = HashMap::new();
        let list = result
            .entry("test_purchase_order_a".to_string())
            .or_default();
        list.push(mock_purchase_order_line_a());
        list.push(mock_purchase_order_line_b());
        Ok(result)
    }
}

// TODO move to mock data and implement proper loader
pub fn mock_purchase_order_line_a() -> PurchaseOrderLineRow {
    inline_init(|r: &mut PurchaseOrderLineRow| {
        r.id = "test_purchase_order_line_a".to_string();
        r.purchase_order_id = "test_purchase_order_a".to_string();
    })
}

pub fn mock_purchase_order_line_b() -> PurchaseOrderLineRow {
    inline_init(|r: &mut PurchaseOrderLineRow| {
        r.id = "test_purchase_order_line_b".to_string();
        r.purchase_order_id = "test_purchase_order_a".to_string();
    })
}
