use repository::{
    Currency, CurrencyFilter, CurrencyRepository, CurrencySort, EqualFilter, RepositoryError,
};

use crate::{i64_to_u32, service_provider::ServiceContext, ListError, ListResult};

pub trait CurrencyServiceTrait: Sync + Send {
    fn get_currency(
        &self,
        ctx: &ServiceContext,
        currency_id: &str,
    ) -> Result<Option<Currency>, RepositoryError> {
        let repository = CurrencyRepository::new(&ctx.connection);

        Ok(repository
            .query_by_filter(CurrencyFilter::new().id(EqualFilter::equal_to(currency_id)))?
            .pop())
    }

    fn get_currencies(
        &self,
        ctx: &ServiceContext,
        filter: Option<CurrencyFilter>,
        sort: Option<CurrencySort>,
    ) -> Result<ListResult<Currency>, ListError> {
        let repository = CurrencyRepository::new(&ctx.connection);

        // Always filter by active currencies
        let filter = filter.unwrap_or_default().is_active(true);

        Ok(ListResult {
            rows: repository.query(Some(filter.clone()), sort)?,
            count: i64_to_u32(repository.count(None)?),
        })
    }
}

pub struct CurrencyService;
impl CurrencyServiceTrait for CurrencyService {}
