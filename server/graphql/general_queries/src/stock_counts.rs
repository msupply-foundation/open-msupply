use async_graphql::*;
use chrono::{Duration, FixedOffset, Utc};
use graphql_core::{
    generic_filters::{EqualFilterBoolInput, EqualFilterStringInput, SimpleStringFilterInput},
    pagination::PaginationInput,
    simple_generic_errors::{AccessDenied, DatabaseError, InternalError},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{ItemConnector, NameNode};
use util::timezone::offset_to_timezone;
pub struct StockCounts {
    timezone_offset: FixedOffset,
    days_till_expired: Option<i32>,
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
        Ok(service.count_expired_stock(&service_ctx, date)?)
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
        Ok(service.count_expired_stock(&service_ctx, date)?)
    }
}

pub fn stock_counts(
    timezone_offset: Option<i32>,
    days_till_expired: Option<i32>,
) -> Result<StockCounts> {
    let timezone_offset = offset_to_timezone(&timezone_offset).ok_or(
        StandardGraphqlError::BadUserInput("Invalid timezone offset".to_string()),
    )?;
    Ok(StockCounts {
        timezone_offset,
        days_till_expired,
    })
}
