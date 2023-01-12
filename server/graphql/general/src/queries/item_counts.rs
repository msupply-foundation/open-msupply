use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};

use service::auth::{Resource, ResourceAccessRequest};

const DEFAULT_LOW_STOCK_THRESHOLD: i32 = 3;
pub struct ItemCounts {
    low_stock_threshold: Option<i32>,
    store_id: String,
}

#[Object]
impl ItemCounts {
    async fn total(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.basic_context()?;
        let service = &service_provider.item_count_service;
        Ok(service.count_total(&service_ctx)?)
    }

    async fn no_stock(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.basic_context()?;
        let service = &service_provider.item_count_service;
        Ok(service.count_no_stock(&service_ctx, &self.store_id)?)
    }

    async fn low_stock(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.basic_context()?;
        let service = &service_provider.item_count_service;
        let low_stock_threshold_in_months = self
            .low_stock_threshold
            .unwrap_or(DEFAULT_LOW_STOCK_THRESHOLD);
        Ok(service.count_low_stock(&service_ctx, &self.store_id, low_stock_threshold_in_months)?)
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
