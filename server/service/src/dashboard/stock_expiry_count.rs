use chrono::{Date, Utc};
use domain::{stock_line::StockLineFilter, DateFilter};
use repository::{RepositoryError, StockLineRepository};

use crate::service_provider::ServiceContext;

pub trait StockExpiryCountTrait {
    /// # Arguments
    ///
    /// * date_time date at which the expired stock is counted
    fn count_expired_stock(
        &self,
        ctx: &ServiceContext,
        date_time: Date<Utc>,
    ) -> Result<i64, RepositoryError>;
}

pub struct StockExpiryCount {}

impl StockExpiryCountTrait for StockExpiryCount {
    fn count_expired_stock(
        &self,
        ctx: &ServiceContext,
        date_time: Date<Utc>,
    ) -> Result<i64, RepositoryError> {
        let repo = StockLineRepository::new(&ctx.connection);
        repo.count(Some(StockLineFilter::new().expiry_date(DateFilter {
            equal_to: None,
            before_or_equal_to: Some(date_time.naive_utc()),
            after_or_equal_to: None,
        })))
    }
}
