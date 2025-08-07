use std::collections::HashMap;

use actix_web::web::Data;
use async_graphql::dataloader::*;
use repository::{EqualFilter, PurchaseOrderFilter, PurchaseOrderRow};
use service::service_provider::ServiceProvider;

use crate::standard_graphql_error::StandardGraphqlError;

pub struct PurchaseOrderByIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for PurchaseOrderByIdLoader {
    type Value = PurchaseOrderRow;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        purchase_order_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let purchase_orders = self
            .service_provider
            .purchase_order_service
            .get_purchase_orders(
                &service_context,
                None,
                None,
                Some(
                    PurchaseOrderFilter::new()
                        .id(EqualFilter::equal_any(purchase_order_ids.to_owned())),
                ),
                None,
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        let mut result: HashMap<String, PurchaseOrderRow> = HashMap::new();
        for purchase_order in purchase_orders.rows {
            result.insert(purchase_order.id.clone(), purchase_order);
        }
        Ok(result)
    }
}
