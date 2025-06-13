use std::collections::HashMap;

use actix_web::web::Data;
use async_graphql::dataloader::*;
use repository::{EqualFilter, PurchaseOrderLine, PurchaseOrderLineFilter};
use service::service_provider::ServiceProvider;

use crate::standard_graphql_error::StandardGraphqlError;

pub struct PurchaseOrderLinesByPurchaseOrderIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for PurchaseOrderLinesByPurchaseOrderIdLoader {
    type Value = Vec<PurchaseOrderLine>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        purchase_order_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let purchase_order_lines = self
            .service_provider
            .purchase_order_line_service
            .get_purchase_order_lines(
                &service_context,
                "",
                None,
                Some(
                    PurchaseOrderLineFilter::new()
                        .purchase_order_id(EqualFilter::equal_any(purchase_order_ids.to_owned())),
                ),
                None,
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        let mut result: HashMap<String, Vec<PurchaseOrderLine>> = HashMap::new();
        for purchase_order_line in purchase_order_lines.rows {
            let list = result
                .entry(
                    purchase_order_line
                        .purchase_order_line_row
                        .purchase_order_id
                        .clone(),
                )
                .or_default();
            list.push(purchase_order_line)
        }
        Ok(result)
    }
}
