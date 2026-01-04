use async_graphql::*;
use chrono::{Duration, FixedOffset, Utc};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use service::{
    auth::{Resource, ResourceAccessRequest},
    preference::{FirstThresholdForExpiringItems, Preference, SecondThresholdForExpiringItems},
};
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
        let service_ctx = service_provider.basic_context()?;
        let service = &service_provider.stock_expiry_count_service;
        let date = Utc::now().with_timezone(&self.timezone_offset).date_naive();
        Ok(service.count_expired_stock(&service_ctx, &self.store_id, None, Some(date))?)
    }

    async fn expiring_soon(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.basic_context()?;
        let service = &service_provider.stock_expiry_count_service;
        let days_till_expired = self.days_till_expired.unwrap_or(7);
        let date = Utc::now().with_timezone(&self.timezone_offset).date_naive()
            + Duration::days(days_till_expired as i64);
        let expired = self.expired(ctx).await?;
        let expiring =
            service.count_expired_stock(&service_ctx, &self.store_id, None, Some(date))? - expired;
        // I don't see how it is possible that expired is greater than expiring.. if it happened it would look daft though
        Ok(std::cmp::max(0, expiring))
    }

    async fn expiring_between_thresholds(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.basic_context()?;
        let service = &service_provider.stock_expiry_count_service;

        let connection = &service_ctx.connection;
        let store_id = self.store_id.clone();

        let first_threshold =
            FirstThresholdForExpiringItems.load(&connection, Some(store_id.clone()))?;
        let second_threshold =
            SecondThresholdForExpiringItems.load(&connection, Some(store_id.clone()))?;

        let today = Utc::now().with_timezone(&self.timezone_offset).date_naive();
        let from_date = today + Duration::days(first_threshold as i64);
        let to_date = today + Duration::days(second_threshold as i64);

        let count_between = service.count_expired_stock(
            &service_ctx,
            &self.store_id,
            Some(from_date),
            Some(to_date),
        )?;
        Ok(std::cmp::max(0, count_between))
    }

    async fn expiring_in_next_three_months(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.basic_context()?;
        let service = &service_provider.stock_expiry_count_service;
        let today = Utc::now().with_timezone(&self.timezone_offset).date_naive();

        // Days in between of: >= 30 and < 90 (going with 89)
        let from_date = today + Duration::days(30);
        let to_date = today + Duration::days(89);

        let count_between = service.count_expired_stock(
            &service_ctx,
            &self.store_id,
            Some(from_date),
            Some(to_date),
        )?;
        Ok(std::cmp::max(0, count_between))
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
