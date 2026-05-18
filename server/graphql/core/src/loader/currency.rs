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
        let connection_manager = self.connection_manager.clone();
        let keys = keys.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, Currency>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = CurrencyRepository::new(&connection);
                let result = repo
                    .query(
                        Some(
                            CurrencyFilter::new()
                                .id(EqualFilter::equal_any(keys))
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
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
