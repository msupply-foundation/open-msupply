use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};

use service::auth::{Resource, ResourceAccessRequest};

const DEFAULT_LOW_STOCK_THRESHOLD: i32 = 3;
pub struct ItemCounts {
    low_stock_threshold: Option<i32>,
    store_id: String,
}

#[derive(SimpleObject)]
pub struct ItemCountsResponse {
    total: i64,
    no_stock: i64,
    low_stock: i64,
    more_than_six_months_stock: i64,
}

#[Object]
impl ItemCounts {
    async fn item_counts(&self, ctx: &Context<'_>) -> Result<ItemCountsResponse> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.basic_context()?;
        let service = &service_provider.item_count_service;
        let low_stock_threshold_in_months = self
            .low_stock_threshold
            .unwrap_or(DEFAULT_LOW_STOCK_THRESHOLD);

        match service.get_item_counts(&service_ctx, &self.store_id, low_stock_threshold_in_months) {
            Ok(item_counts) => Ok(ItemCountsResponse {
                total: item_counts.total,
                no_stock: item_counts.no_stock,
                low_stock: item_counts.low_stock,
                more_than_six_months_stock: item_counts.more_than_six_months_stock,
            }),
            Err(err) => Err(err.into()),
        }
    }
}

pub fn item_counts(
    ctx: &Context<'_>,
    store_id: String,
    low_stock_threshold: Option<i32>,
) -> Result<ItemCounts> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::StockCount,
            store_id: Some(store_id.clone()),
        },
    )?;

    Ok(ItemCounts {
        low_stock_threshold,
        store_id,
    })
}
