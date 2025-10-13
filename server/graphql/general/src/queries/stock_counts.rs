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
        Ok(service.count_expired_stock(&service_ctx, &self.store_id, date)?)
    }

    async fn expiring_soon(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.basic_context()?;
        let service = &service_provider.stock_expiry_count_service;
        let days_till_expired = self.days_till_expired.unwrap_or(7);
        let date = Utc::now().with_timezone(&self.timezone_offset).date_naive()
            + Duration::days(days_till_expired as i64);
        let expired = self.expired(ctx).await?;
        let expiring = service.count_expired_stock(&service_ctx, &self.store_id, date)? - expired;
        // I don't see how it is possible that expired is greater than expiring.. if it happened it would look daft though
        Ok(std::cmp::max(0, expiring))
    }

    async fn batches_expiring_between_threshold(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.basic_context()?;
        let stock_expiry_count_service = &service_provider.stock_expiry_count_service;

        let connection = &service_ctx.connection;
        let store_id = Some(self.store_id.clone());

        let first_threshold = FirstThresholdForExpiringItems.load(&connection, store_id.clone())?;
        let second_threshold =
            SecondThresholdForExpiringItems.load(&connection, store_id.clone())?;

        let today = Utc::now().with_timezone(&self.timezone_offset).date_naive();
        let first_date = today + Duration::days(first_threshold as i64);
        let second_date = today + Duration::days(second_threshold as i64);

        let count_at_first = stock_expiry_count_service.count_expired_stock(
            &service_ctx,
            &self.store_id,
            first_date,
        )?;
        let count_at_second = stock_expiry_count_service.count_expired_stock(
            &service_ctx,
            &self.store_id,
            second_date,
        )?;

        let count_between = count_at_second - count_at_first;
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
