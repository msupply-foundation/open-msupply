use repository::{Currency, CurrencyFilter, CurrencyRepository, EqualFilter};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct CurrencyByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for CurrencyByIdLoader {
    type Value = Currency;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = CurrencyRepository::new(&connection);
        let result = repo
            .query(
                Some(
                    CurrencyFilter::new()
                        .id(EqualFilter::equal_any(keys.to_vec()))
                        .is_active(true),
                ),
                None,
            )?
            .into_iter()
            .map(|c| {
                let id = c.currency_row.id.clone();
                (id, c)
            })
            .collect();
        Ok(result)
    }
}
