use repository::{CurrencyFilter, CurrencyRepository, RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use std::collections::HashMap;

pub struct HomeCurrencyLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<()> for HomeCurrencyLoader {
    type Value = String;
    type Error = RepositoryError;

    async fn load(&self, keys: &[()]) -> Result<HashMap<(), Self::Value>, Self::Error> {
        let mut result = HashMap::new();
        if keys.is_empty() {
            return Ok(result);
        }

        let connection = self.connection_manager.connection()?;
        let repo = CurrencyRepository::new(&connection);
        let home_currency = repo
            .query_by_filter(CurrencyFilter::new().is_home_currency(true))?
            .pop();

        if let Some(home_currency) = home_currency {
            result.insert((), home_currency.currency_row.code);
        }
        Ok(result)
    }
}
