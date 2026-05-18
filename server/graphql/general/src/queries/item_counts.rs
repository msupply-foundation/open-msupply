use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use service::auth::{Resource, ResourceAccessRequest};

const DEFAULT_LOW_STOCK_THRESHOLD: f64 = 3.0;
const DEFAULT_HIGH_STOCK_THRESHOLD: f64 = 6.0;
pub struct ItemCounts {
    low_stock_threshold: Option<f64>,
    high_stock_threshold: Option<f64>,
    store_id: String,
}

#[derive(SimpleObject)]
pub struct ItemCountsResponse {
    total: i64,
    no_stock: i64,
    low_stock: i64,
    high_stock: i64,
    out_of_stock_products: i64,
    products_at_risk_of_being_out_of_stock: i64,
    products_overstocked: i64,
}

#[Object]
impl ItemCounts {
    async fn item_counts(&self, ctx: &Context<'_>) -> Result<ItemCountsResponse> {
        let service_provider = ctx.service_provider_data();
        let store_id = self.store_id.clone();
        let low_stock_threshold_in_months = self
            .low_stock_threshold
            .unwrap_or(DEFAULT_LOW_STOCK_THRESHOLD);
        let high_stock_threshold_in_months = self
            .high_stock_threshold
            .unwrap_or(DEFAULT_HIGH_STOCK_THRESHOLD);

        let result = tokio::task::spawn_blocking(move || {
            let service_ctx = service_provider
                .basic_context()
                .map_err(StandardGraphqlError::from_repository_error)?;
            let service = &service_provider.item_count_service;
            service
                .get_item_counts(
                    &service_ctx,
                    &store_id,
                    low_stock_threshold_in_months,
                    high_stock_threshold_in_months,
                )
                .map_err(|err| StandardGraphqlError::from_error(&err))
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)??;

        Ok(ItemCountsResponse {
            total: result.total,
            no_stock: result.no_stock,
            low_stock: result.low_stock,
            high_stock: result.high_stock,
            out_of_stock_products: result.out_of_stock_products,
            products_at_risk_of_being_out_of_stock: result.products_at_risk_of_being_out_of_stock,
            products_overstocked: result.products_overstocked,
        })
    }
}

pub fn item_counts(
    ctx: &Context<'_>,
    store_id: String,
    low_stock_threshold: Option<f64>,
    high_stock_threshold: Option<f64>,
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
        high_stock_threshold,
        store_id,
    })
}
