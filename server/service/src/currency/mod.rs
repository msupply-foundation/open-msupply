use repository::{Currency, CurrencySort, RepositoryError};

use crate::{service_provider::ServiceContext, ListError, ListResult};

use self::query::{get_currencies, get_currency};

pub mod query;

pub trait CurrencyServiceTrait: Sync + Send {
    fn get_currency(
        &self,
        ctx: &ServiceContext,
        currency_id: &str,
    ) -> Result<Option<Currency>, RepositoryError> {
        get_currency(ctx, currency_id)
    }

    fn get_currencies(
        &self,
        ctx: &ServiceContext,
        sort: Option<CurrencySort>,
    ) -> Result<ListResult<Currency>, ListError> {
        get_currencies(ctx, sort)
    }
}

pub struct CurrencyService;
impl CurrencyServiceTrait for CurrencyService {}
