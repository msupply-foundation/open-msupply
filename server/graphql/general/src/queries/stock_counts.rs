use async_graphql::*;
use chrono::{Duration, FixedOffset, Utc};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use service::permission_validation::{Resource, ResourceAccessRequest};
use util::timezone::offset_to_timezone;
pub struct StockCounts {
    timezone_offset: FixedOffset,
    days_till_expired: Option<i32>,
    store_id: String,
}

#[Object]
impl StockCounts {
    async fn expired(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.context()?;
        let service = &service_provider.stock_expiry_count_service;
        let date = Utc::now()
            .with_timezone(&self.timezone_offset)
            .date()
            .naive_utc();
        Ok(service.count_expired_stock(&service_ctx, &self.store_id, date)?)
    }

    async fn expiring_soon(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.context()?;
        let service = &service_provider.stock_expiry_count_service;
        let days_till_expired = self.days_till_expired.unwrap_or(7);
        let date = Utc::now()
            .with_timezone(&self.timezone_offset)
            .date()
            .naive_utc()
            + Duration::days(days_till_expired as i64);
        Ok(service.count_expired_stock(&service_ctx, &self.store_id, date)?)
    }
}

pub fn stock_counts(
    ctx: &Context<'_>,
    store_id: String,
    timezone_offset: Option<i32>,
    days_till_expired: Option<i32>,
) -> Result<StockCounts> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::StockCount,
            store_id: Some(store_id.clone()),
        },
    )?;

    let timezone_offset = offset_to_timezone(&timezone_offset).ok_or(
        StandardGraphqlError::BadUserInput("Invalid timezone offset".to_string()),
    )?;
    Ok(StockCounts {
        timezone_offset,
        days_till_expired,
        store_id,
    })
}
