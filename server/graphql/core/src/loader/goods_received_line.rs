// use std::collections::HashMap;

// use async_graphql::dataloader::*;

use std::collections::HashMap;

use actix_web::web::Data;
use async_graphql::dataloader::Loader;
use repository::{EqualFilter, GoodsReceivedLine, GoodsReceivedLineFilter};
use service::service_provider::ServiceProvider;

use crate::standard_graphql_error::StandardGraphqlError;
// use service::service_provider::ServiceProvider;

// use crate::standard_graphql_error::StandardGraphqlError;

pub struct GoodsReceivedLinesByGoodsReceivedIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for GoodsReceivedLinesByGoodsReceivedIdLoader {
    type Value = Vec<GoodsReceivedLine>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        goods_received_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let goods_received_lines = self
            .service_provider
            .goods_received_line_service
            .get_goods_received_lines(
                &service_context,
                None,
                None,
                Some(
                    GoodsReceivedLineFilter::new()
                        .goods_received_id(EqualFilter::equal_any(goods_received_ids.to_owned())),
                ),
                None,
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        let mut result: HashMap<String, Vec<GoodsReceivedLine>> = HashMap::new();
        for goods_received_line in goods_received_lines.rows {
            let list: &mut Vec<GoodsReceivedLine> = result
                .entry(
                    goods_received_line
                        .goods_received_line_row
                        .goods_received_id
                        .clone(),
                )
                .or_default();
            list.push(goods_received_line)
        }
        Ok(result)
    }
}
