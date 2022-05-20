use chrono::NaiveDate;
use repository::{DateFilter, EqualFilter, RepositoryError, StockLineFilter, StockLineRepository};

use crate::service_provider::ServiceContext;

pub trait StockExpiryCountServiceTrait: Send + Sync {
    /// # Arguments
    ///
    /// * date_time date at which the expired stock is counted
    fn count_expired_stock(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        date_time: NaiveDate,
    ) -> Result<i64, RepositoryError> {
        StockExpiryServiceCount {}.count_expired_stock(ctx, store_id, date_time)
    }
}

pub struct StockExpiryServiceCount {}

impl StockExpiryCountServiceTrait for StockExpiryServiceCount {
    fn count_expired_stock(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        date_time: NaiveDate,
    ) -> Result<i64, RepositoryError> {
        let repo = StockLineRepository::new(&ctx.connection);
        repo.count(Some(
            StockLineFilter::new()
                .expiry_date(DateFilter {
                    equal_to: None,
                    before_or_equal_to: Some(date_time),
                    after_or_equal_to: None,
                })
                .store_id(EqualFilter::equal_to(&store_id)),
        ))
    }
}
